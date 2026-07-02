/**
 * Minimal MCP stdio client for tests: spawns index.js and speaks
 * newline-delimited JSON-RPC over the child's stdin/stdout.
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SERVER_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "index.js"
);

export class McpTestClient {
  constructor({ env = {} } = {}) {
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = "";
    this.stderr = "";

    this.child = spawn(process.execPath, [SERVER_PATH], {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.child.stdout.setEncoding("utf8");
    this.child.stdout.on("data", (chunk) => {
      this.buffer += chunk;
      let newlineIndex;
      while ((newlineIndex = this.buffer.indexOf("\n")) !== -1) {
        const line = this.buffer.slice(0, newlineIndex).trim();
        this.buffer = this.buffer.slice(newlineIndex + 1);
        if (!line) continue;
        const message = JSON.parse(line);
        const resolve = this.pending.get(message.id);
        if (resolve) {
          this.pending.delete(message.id);
          resolve(message);
        }
      }
    });

    this.child.stderr.setEncoding("utf8");
    this.child.stderr.on("data", (chunk) => {
      this.stderr += chunk;
    });
  }

  request(method, params = {}, { timeoutMs = 10000 } = {}) {
    const id = this.nextId;
    this.nextId += 1;

    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for response to ${method}`));
      }, timeoutMs);
      this.pending.set(id, (message) => {
        clearTimeout(timer);
        resolve(message);
      });
    });

    this.child.stdin.write(
      JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"
    );
    return promise;
  }

  notify(method, params = {}) {
    this.child.stdin.write(
      JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n"
    );
  }

  async initialize() {
    const response = await this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "uno-r3-mcp-test-client", version: "1.0.0" },
    });
    this.notify("notifications/initialized");
    return response;
  }

  callTool(name, args = {}) {
    return this.request("tools/call", { name, arguments: args });
  }

  close() {
    this.child.kill();
  }
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
