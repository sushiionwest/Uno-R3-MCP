#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

// arduino-cli location: taken from ARDUINO_CLI_PATH if set, otherwise
// arduino-cli is expected to be on the PATH.
const ARDUINO_CLI = process.env.ARDUINO_CLI_PATH || "arduino-cli";

// Store active connections
const activeConnections = new Map();
const dataBuffers = new Map();

// Create server instance
const server = new Server(
  {
    name: "uno-r3-mcp",
    version: "1.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Run arduino-cli with the given arguments, failing with a clear message
// when the binary cannot be found.
async function runArduinoCli(cliArgs) {
  try {
    return await execFileAsync(ARDUINO_CLI, cliArgs, { windowsHide: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        `arduino-cli not found at "${ARDUINO_CLI}". Install arduino-cli and either add it to your PATH or set the ARDUINO_CLI_PATH environment variable to its full path.`
      );
    }
    throw new Error(error.stderr || error.message);
  }
}

// Validate that a required string argument is present and non-empty.
function requireString(args, name) {
  const value = args?.[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required string argument: ${name}`);
  }
  return value;
}

// Close an open connection (used before uploads, which need the port free).
function closeConnection(port) {
  return new Promise((resolve) => {
    const serialPort = activeConnections.get(port);
    if (!serialPort) {
      resolve();
      return;
    }
    serialPort.close(() => {
      activeConnections.delete(port);
      resolve();
    });
  });
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_serial_ports",
        description: "List all available serial ports (COM ports) where Arduino might be connected",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "connect_arduino",
        description: "Connect to Arduino on specified COM port with given baud rate",
        inputSchema: {
          type: "object",
          properties: {
            port: {
              type: "string",
              description: "COM port (e.g., COM3, COM4)",
            },
            baudRate: {
              type: "number",
              description: "Baud rate for serial communication (default: 9600)",
              default: 9600,
            },
          },
          required: ["port"],
        },
      },
      {
        name: "read_serial_data",
        description: "Read data from connected Arduino. Returns recent data buffer.",
        inputSchema: {
          type: "object",
          properties: {
            port: {
              type: "string",
              description: "COM port to read from",
            },
            lines: {
              type: "number",
              description: "Number of recent lines to return (default: 50)",
              default: 50,
            },
            clear: {
              type: "boolean",
              description: "Clear the data buffer after reading (default: false)",
              default: false,
            },
          },
          required: ["port"],
        },
      },
      {
        name: "send_serial_data",
        description: "Send data/command to Arduino over serial",
        inputSchema: {
          type: "object",
          properties: {
            port: {
              type: "string",
              description: "COM port to send to",
            },
            data: {
              type: "string",
              description: "Data to send to Arduino",
            },
          },
          required: ["port", "data"],
        },
      },
      {
        name: "disconnect_arduino",
        description: "Disconnect from Arduino serial port",
        inputSchema: {
          type: "object",
          properties: {
            port: {
              type: "string",
              description: "COM port to disconnect",
            },
          },
          required: ["port"],
        },
      },
      {
        name: "detect_boards",
        description: "Detect connected Arduino boards and their FQBNs using arduino-cli",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "compile_sketch",
        description: "Compile an Arduino sketch with arduino-cli",
        inputSchema: {
          type: "object",
          properties: {
            sketchPath: {
              type: "string",
              description: "Path to the sketch folder or .ino file",
            },
            fqbn: {
              type: "string",
              description: "Fully Qualified Board Name (default: arduino:avr:uno)",
              default: "arduino:avr:uno",
            },
          },
          required: ["sketchPath"],
        },
      },
      {
        name: "upload_sketch",
        description: "Upload a compiled sketch to an Arduino board with arduino-cli. Closes any open serial connection on the port first.",
        inputSchema: {
          type: "object",
          properties: {
            sketchPath: {
              type: "string",
              description: "Path to the sketch folder or .ino file",
            },
            port: {
              type: "string",
              description: "Serial port the board is on (e.g., COM3)",
            },
            fqbn: {
              type: "string",
              description: "Fully Qualified Board Name (default: arduino:avr:uno)",
              default: "arduino:avr:uno",
            },
          },
          required: ["sketchPath", "port"],
        },
      },
      {
        name: "compile_and_upload",
        description: "Compile and upload a sketch to an Arduino board in one step with arduino-cli. Closes any open serial connection on the port first.",
        inputSchema: {
          type: "object",
          properties: {
            sketchPath: {
              type: "string",
              description: "Path to the sketch folder or .ino file",
            },
            port: {
              type: "string",
              description: "Serial port the board is on (e.g., COM3)",
            },
            fqbn: {
              type: "string",
              description: "Fully Qualified Board Name (default: arduino:avr:uno)",
              default: "arduino:avr:uno",
            },
          },
          required: ["sketchPath", "port"],
        },
      },
      {
        name: "create_sketch",
        description: "Create a new Arduino sketch folder with an .ino file (template code if none provided)",
        inputSchema: {
          type: "object",
          properties: {
            sketchName: {
              type: "string",
              description: "Name of the sketch (creates a folder with this name containing <name>.ino)",
            },
            sketchCode: {
              type: "string",
              description: "Arduino code for the sketch. If not provided, a basic template is used.",
            },
            basePath: {
              type: "string",
              description: "Directory to create the sketch folder in (default: <home>/arduino-sketches)",
            },
          },
          required: ["sketchName"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_serial_ports": {
        const ports = await SerialPort.list();
        const portInfo = ports.map(port => ({
          path: port.path,
          manufacturer: port.manufacturer,
          serialNumber: port.serialNumber,
          productId: port.productId,
          vendorId: port.vendorId,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(portInfo, null, 2),
            },
          ],
        };
      }

      case "connect_arduino": {
        const port = requireString(args, "port");
        const { baudRate = 9600 } = args;

        // Close existing connection if any
        await closeConnection(port);

        // Create new connection
        const serialPort = new SerialPort({
          path: port,
          baudRate: baudRate,
        });

        // Set up data buffer for this port
        if (!dataBuffers.has(port)) {
          dataBuffers.set(port, []);
        }

        // Set up parser to read line by line
        const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

        parser.on('data', (line) => {
          const buffer = dataBuffers.get(port);
          buffer.push({
            timestamp: new Date().toISOString(),
            data: line.trim(),
          });

          // Keep buffer size manageable (last 1000 lines)
          if (buffer.length > 1000) {
            buffer.shift();
          }
        });

        activeConnections.set(port, serialPort);

        // Wait for the port to actually open (or fail) before reporting success
        await new Promise((resolve, reject) => {
          serialPort.on('open', resolve);
          serialPort.on('error', (err) => {
            activeConnections.delete(port);
            reject(err);
          });
        });

        return {
          content: [
            {
              type: "text",
              text: `Connected to ${port} at ${baudRate} baud`,
            },
          ],
        };
      }

      case "read_serial_data": {
        const port = requireString(args, "port");
        const { lines = 50, clear = false } = args;

        if (!dataBuffers.has(port)) {
          return {
            content: [
              {
                type: "text",
                text: `No data buffer for ${port}. Connect to the port first.`,
              },
            ],
          };
        }

        const buffer = dataBuffers.get(port);
        const recentData = buffer.slice(-lines);
        if (clear) {
          buffer.length = 0;
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(recentData, null, 2),
            },
          ],
        };
      }

      case "send_serial_data": {
        const port = requireString(args, "port");
        const data = requireString(args, "data");

        if (!activeConnections.has(port)) {
          return {
            content: [
              {
                type: "text",
                text: `Not connected to ${port}. Connect first.`,
              },
            ],
          };
        }

        const serialPort = activeConnections.get(port);
        serialPort.write(data + '\n');

        return {
          content: [
            {
              type: "text",
              text: `Sent to ${port}: ${data}`,
            },
          ],
        };
      }

      case "disconnect_arduino": {
        const port = requireString(args, "port");

        if (!activeConnections.has(port)) {
          return {
            content: [
              {
                type: "text",
                text: `No active connection to ${port}`,
              },
            ],
          };
        }

        await closeConnection(port);

        return {
          content: [
            {
              type: "text",
              text: `Disconnected from ${port}`,
            },
          ],
        };
      }

      case "detect_boards": {
        const { stdout } = await runArduinoCli(["board", "list"]);

        return {
          content: [
            {
              type: "text",
              text: stdout,
            },
          ],
        };
      }

      case "compile_sketch": {
        const sketchPath = requireString(args, "sketchPath");
        const { fqbn = "arduino:avr:uno" } = args;

        const { stdout } = await runArduinoCli(["compile", "--fqbn", fqbn, sketchPath]);

        return {
          content: [
            {
              type: "text",
              text: `Compilation successful.\n\n${stdout}`,
            },
          ],
        };
      }

      case "upload_sketch": {
        const sketchPath = requireString(args, "sketchPath");
        const port = requireString(args, "port");
        const { fqbn = "arduino:avr:uno" } = args;

        // Free the port before uploading
        await closeConnection(port);

        const { stdout } = await runArduinoCli(["upload", "-p", port, "--fqbn", fqbn, sketchPath]);

        return {
          content: [
            {
              type: "text",
              text: `Upload successful.\n\n${stdout}`,
            },
          ],
        };
      }

      case "compile_and_upload": {
        const sketchPath = requireString(args, "sketchPath");
        const port = requireString(args, "port");
        const { fqbn = "arduino:avr:uno" } = args;

        // Free the port before uploading
        await closeConnection(port);

        const compileResult = await runArduinoCli(["compile", "--fqbn", fqbn, sketchPath]);
        const uploadResult = await runArduinoCli(["upload", "-p", port, "--fqbn", fqbn, sketchPath]);

        return {
          content: [
            {
              type: "text",
              text: `Compile and upload successful.\n\nCompile output:\n${compileResult.stdout}\n\nUpload output:\n${uploadResult.stdout}`,
            },
          ],
        };
      }

      case "create_sketch": {
        const sketchName = requireString(args, "sketchName");
        const { sketchCode, basePath = path.join(os.homedir(), "arduino-sketches") } = args;

        if (/[\\/]/.test(sketchName)) {
          throw new Error("sketchName must be a plain name, not a path");
        }

        const sketchFolder = path.join(basePath, sketchName);
        const sketchFile = path.join(sketchFolder, `${sketchName}.ino`);

        await fs.mkdir(sketchFolder, { recursive: true });

        const defaultCode = `void setup() {
  Serial.begin(9600);
  Serial.println("${sketchName} Ready!");
}

void loop() {
  // Your code here
}
`;

        await fs.writeFile(sketchFile, sketchCode || defaultCode, "utf8");

        return {
          content: [
            {
              type: "text",
              text: `Sketch created at ${sketchFile}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Uno-R3-MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
