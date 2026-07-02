#!/usr/bin/env node

/**
 * Smoke test: start the server in mock mode, run the MCP handshake, drive a
 * simulated thrust test end to end, and print the transcript. Needs zero
 * hardware.
 *
 *   npm run smoke
 */

import { McpTestClient, sleep } from "./mcp-client.js";

function show(step, payload) {
  console.log(`\n>>> ${step}`);
  console.log(JSON.stringify(payload, null, 2));
}

const client = new McpTestClient({ env: { MCP_MOCK_SERIAL: "1" } });

try {
  show("initialize", (await client.initialize()).result.serverInfo);

  const toolsResponse = await client.request("tools/list");
  show(
    "tools/list",
    toolsResponse.result.tools.map((tool) => tool.name)
  );

  show(
    "tools/call list_serial_ports",
    (await client.callTool("list_serial_ports")).result
  );
  show(
    "tools/call connect_arduino {port: COM7}",
    (await client.callTool("connect_arduino", { port: "COM7" })).result
  );
  show(
    "tools/call send_serial_data {port: COM7, data: START}",
    (await client.callTool("send_serial_data", { port: "COM7", data: "START" }))
      .result
  );

  console.log("\n... waiting for the simulated burn to finish ...");
  await sleep(2800);

  show(
    "tools/call read_serial_data {port: COM7, lines: 40}",
    (await client.callTool("read_serial_data", { port: "COM7", lines: 40 }))
      .result
  );
  show(
    "tools/call disconnect_arduino {port: COM7}",
    (await client.callTool("disconnect_arduino", { port: "COM7" })).result
  );

  console.log("\nSmoke test passed.");
} finally {
  client.close();
}
