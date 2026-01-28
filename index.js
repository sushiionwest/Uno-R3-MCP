#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";

// Store active connections
const activeConnections = new Map();
const dataBuffers = new Map();

// Create server instance
const server = new Server(
  {
    name: "arduino-thrust-test",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

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
        const { port, baudRate = 9600 } = args;

        // Close existing connection if any
        if (activeConnections.has(port)) {
          const existingPort = activeConnections.get(port);
          existingPort.close();
        }

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

        serialPort.on('error', (err) => {
          console.error(`Error on ${port}:`, err.message);
        });

        activeConnections.set(port, serialPort);

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
        const { port, lines = 50 } = args;

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
        const { port, data } = args;

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
        const { port } = args;

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

        const serialPort = activeConnections.get(port);
        serialPort.close();
        activeConnections.delete(port);

        return {
          content: [
            {
              type: "text",
              text: `Disconnected from ${port}`,
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
  console.error("Arduino Thrust Test MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
