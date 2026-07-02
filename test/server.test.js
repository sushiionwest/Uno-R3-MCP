import test from "node:test";
import assert from "node:assert/strict";
import { McpTestClient, sleep } from "../scripts/mcp-client.js";

const MOCK_ENV = { MCP_MOCK_SERIAL: "1", MCP_MOCK_EMIT_MS: "5" };

const EXPECTED_TOOLS = [
  "list_serial_ports",
  "connect_arduino",
  "read_serial_data",
  "send_serial_data",
  "disconnect_arduino",
  "detect_boards",
  "compile_sketch",
  "upload_sketch",
  "compile_and_upload",
  "create_sketch",
];

// Parse a labeled mock response back into the buffer entries array.
function parseBufferEntries(text) {
  return JSON.parse(text.slice(text.indexOf("\n") + 1));
}

function contentText(response) {
  return response.result.content[0].text;
}

// Run a full connect -> START -> read cycle and return the CSV data lines.
async function runBurn(client, port) {
  await client.callTool("connect_arduino", { port });
  await client.callTool("send_serial_data", { port, data: "START" });
  // 25 samples at 5 ms pacing finish in ~125 ms; wait with generous margin
  await sleep(600);
  const response = await client.callTool("read_serial_data", {
    port,
    lines: 100,
  });
  const entries = parseBufferEntries(contentText(response));
  const lines = entries.map((entry) => entry.data);
  return {
    lines,
    csv: lines.filter((line) => /^\d+\.\d{3},\d+\.\d{2},\d+\.\d$/.test(line)),
  };
}

test("mock mode end to end over stdio", async (t) => {
  const client = new McpTestClient({ env: MOCK_ENV });
  t.after(() => client.close());

  let firstBurnCsv;

  await t.test("initialize handshake", async () => {
    const response = await client.initialize();
    assert.equal(response.result.serverInfo.name, "uno-r3-mcp");
    assert.ok(response.result.capabilities.tools);
  });

  await t.test("tools/list exposes all 10 tools", async () => {
    const response = await client.request("tools/list");
    const names = response.result.tools.map((tool) => tool.name);
    assert.deepEqual([...names].sort(), [...EXPECTED_TOOLS].sort());
  });

  await t.test("list_serial_ports reports the simulated port", async () => {
    const response = await client.callTool("list_serial_ports");
    const text = contentText(response);
    assert.match(text, /SIMULATED/);
    assert.match(text, /COM7/);
  });

  await t.test("connect_arduino connects and emits the boot banner", async () => {
    const response = await client.callTool("connect_arduino", { port: "COM7" });
    const text = contentText(response);
    assert.match(text, /SIMULATED/);
    assert.match(text, /Connected to COM7 at 9600 baud/);

    const read = await client.callTool("read_serial_data", { port: "COM7" });
    const lines = parseBufferEntries(contentText(read)).map((e) => e.data);
    assert.ok(lines.includes("READY"));
  });

  await t.test("send START and read the deterministic burn", async () => {
    const sent = await client.callTool("send_serial_data", {
      port: "COM7",
      data: "START",
    });
    assert.match(contentText(sent), /SIMULATED/);
    assert.match(contentText(sent), /Sent to COM7: START/);

    await sleep(600);
    const response = await client.callTool("read_serial_data", {
      port: "COM7",
      lines: 100,
    });
    const text = contentText(response);
    assert.match(text, /SIMULATED/);

    const lines = parseBufferEntries(text).map((entry) => entry.data);
    assert.ok(lines.includes("TEST_STARTED"));
    assert.ok(lines.includes("time_s,thrust_N,temp_C"));

    const csv = lines.filter((line) =>
      /^\d+\.\d{3},\d+\.\d{2},\d+\.\d$/.test(line)
    );
    assert.equal(csv.length, 25);
    assert.equal(csv[0], "0.000,0.13,23.4");
    assert.equal(csv[24], "2.400,0.23,25.8");

    const peak = Math.max(...csv.map((line) => Number(line.split(",")[1])));
    assert.equal(peak, 144.44);

    firstBurnCsv = csv;
  });

  await t.test("STATUS reports READY after the burn completes", async () => {
    await client.callTool("send_serial_data", { port: "COM7", data: "STATUS" });
    await sleep(50);
    const response = await client.callTool("read_serial_data", {
      port: "COM7",
      lines: 3,
    });
    const lines = parseBufferEntries(contentText(response)).map((e) => e.data);
    assert.ok(lines.includes("STATUS: READY"));
  });

  await t.test("read_serial_data without a connection explains itself", async () => {
    const response = await client.callTool("read_serial_data", { port: "COM99" });
    assert.match(contentText(response), /No data buffer for COM99/);
  });

  await t.test("detect_boards is simulated", async () => {
    const response = await client.callTool("detect_boards");
    const text = contentText(response);
    assert.match(text, /SIMULATED/);
    assert.match(text, /arduino:avr:uno/);
  });

  await t.test("compile_sketch rejects a missing sketchPath", async () => {
    const response = await client.callTool("compile_sketch", {});
    assert.equal(response.result.isError, true);
    assert.match(contentText(response), /sketchPath/);
  });

  await t.test("compile_sketch rejects an empty sketchPath", async () => {
    const response = await client.callTool("compile_sketch", { sketchPath: "  " });
    assert.equal(response.result.isError, true);
    assert.match(contentText(response), /sketchPath/);
  });

  await t.test("compile_sketch with valid args is simulated, not executed", async () => {
    const response = await client.callTool("compile_sketch", {
      sketchPath: "examples/thrust_test.ino",
    });
    assert.ok(!response.result.isError);
    const text = contentText(response);
    assert.match(text, /SIMULATED/);
    assert.match(text, /Compilation skipped/);
    assert.match(text, /--fqbn arduino:avr:uno/);
  });

  await t.test("upload_sketch rejects a missing port", async () => {
    const response = await client.callTool("upload_sketch", {
      sketchPath: "examples/thrust_test.ino",
    });
    assert.equal(response.result.isError, true);
    assert.match(contentText(response), /port/);
  });

  await t.test("disconnect_arduino closes the connection", async () => {
    const response = await client.callTool("disconnect_arduino", { port: "COM7" });
    assert.match(contentText(response), /Disconnected from COM7/);

    const again = await client.callTool("disconnect_arduino", { port: "COM7" });
    assert.match(contentText(again), /No active connection to COM7/);
  });

  await t.test("burn is byte-identical across server instances", async () => {
    const second = new McpTestClient({ env: MOCK_ENV });
    try {
      await second.initialize();
      const { csv } = await runBurn(second, "COM7");
      assert.deepEqual(csv, firstBurnCsv);
    } finally {
      second.close();
    }
  });
});
