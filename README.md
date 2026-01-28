# Arduino MCP Server

**Enable any LLM to communicate directly with Arduino boards for data collection, thrust testing, sensor monitoring, and automation.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

## What Is This?

This is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that gives AI assistants (Claude, ChatGPT, etc.) the ability to:

- 🔌 **Connect** to Arduino boards via serial/USB
- 📊 **Read** real-time sensor data
- 📤 **Send** commands to Arduino
- 🚀 **Analyze** thrust tests, experiments, and data
- 🤖 **Automate** testing workflows

Perfect for **aerospace thrust testing**, **data logging**, **sensor monitoring**, and **hardware automation**.

---

## Quick Start

### 1. Install
```bash
git clone https://github.com/sushiionwest/Uno-R3-MCP
cd arduino-mcp-server
npm install
```

### 2. Configure Your LLM

Add to your config file (e.g., `%APPDATA%\Claude Code\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "arduino": {
      "command": "node",
      "args": ["C:\arduino-mcp-server\index.js"]
    }
  }
}
```

### 3. Restart Your LLM

### 4. Test It
Upload `examples/thrust_test.ino` to your Arduino, then ask your LLM:

```
Find my Arduino and show me what data it's sending.
```

---

## Features

### 5 Powerful Tools

| Tool | Purpose |
|------|---------|
| `list_serial_ports` | Find which COM port your Arduino is on |
| `connect_arduino` | Establish serial connection (any baud rate) |
| `read_serial_data` | Read buffered data from Arduino |
| `send_serial_data` | Send commands to Arduino |
| `disconnect_arduino` | Close connection |

### Built-in Capabilities

- ✅ **Automatic data buffering** (last 1000 readings)
- ✅ **Timestamp every reading**
- ✅ **Multiple baud rates** (9600 - 250000)
- ✅ **Line-by-line parsing**
- ✅ **Error handling & recovery**
- ✅ **Support for any Arduino board**

---

## Example Use Cases

### Aerospace Thrust Testing
```
Run my rocket motor thrust test. Monitor it in real-time and calculate peak thrust, average thrust, total impulse, and burn time.
```

Your LLM will:
1. Connect to Arduino
2. Send START command
3. Collect data during burn
4. Analyze performance
5. Generate detailed report

### Continuous Monitoring
```
Monitor my temperature sensor. Alert me if it exceeds 100°C.
```

### Data Export
```
Read all my test data and export it as CSV for Excel.
```

### Multi-Test Comparison
```
I'm running 5 tests with different configurations. For each test, collect the data and then tell me which configuration performed best.
```

---

## Documentation

- **[INSTALL.md](INSTALL.md)** - Detailed installation for Windows/Mac/Linux
- **[LLM_GUIDE.md](LLM_GUIDE.md)** - Complete reference for AI assistants
- **[PROMPT_TEMPLATES.md](PROMPT_TEMPLATES.md)** - Ready-to-use prompts
- **[examples/](examples/)** - Arduino sketches

---

## Example Arduino Sketch

```cpp
void setup() {
  Serial.begin(9600);
}

void loop() {
  float thrust = readThrustSensor();
  Serial.print("Thrust: ");
  Serial.print(thrust);
  Serial.println(" N");
  delay(100);
}
```

See `examples/thrust_test.ino` for complete thrust testing example with:
- Load cell integration (HX711)
- Command handling (START/STOP/CALIBRATE)
- CSV data output
- Simulation mode (test without hardware)

---

## How It Works

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│     LLM     │ ◄─────► │  MCP Server  │ ◄─────► │   Arduino   │
│  (Claude)   │   MCP   │  (This repo) │  Serial │ (Your board)│
└─────────────┘         └──────────────┘         └─────────────┘
```

1. User asks LLM a question about Arduino
2. LLM calls MCP tools (list_ports, connect, read_data)
3. MCP server communicates with Arduino over serial
4. Data flows back to LLM
5. LLM analyzes and responds to user

---

## Compatible Hardware

### Tested Boards
- ✅ Arduino Uno / Elegoo Uno R3
- ✅ Arduino Nano
- ✅ Arduino Mega
- ✅ ESP32 / ESP8266
- ✅ Most Arduino-compatible boards

### Operating Systems
- ✅ Windows 10/11
- ✅ macOS
- ✅ Linux (Ubuntu, Debian, etc.)

### LLMs
- ✅ Claude Code
- ✅ Any MCP-compatible LLM

---

## Troubleshooting

### Arduino not detected?
```
npm test
```
This runs diagnostics and shows available ports.

### Connection issues?
- Close Arduino IDE (it locks the COM port)
- Try different baud rates: 9600, 115200
- Check USB cable

### Windows driver issues?
- Install [CH340 drivers](https://sparks.gogo.co.nz/ch340.html) for clone boards
- Install [official Arduino drivers](https://www.arduino.cc/en/software#drivers) for genuine boards

See [INSTALL.md](INSTALL.md) for complete troubleshooting guide.

---

## Advanced Usage

### Custom Baud Rate
```
Connect to my Arduino at 115200 baud for high-speed data collection.
```

### Multiple Sensors
The server handles any data format your Arduino sends:
- CSV: `time,thrust,temp`
- JSON: `{"thrust":45.2,"temp":23.5}`
- Key-value: `Thrust: 45.2 N`

### Automated Testing
```
Run 10 consecutive tests with 30 second breaks. Calculate average performance across all tests.
```

---

## Development

### Run Tests
```bash
npm test
```

### Debug Mode
```bash
DEBUG=* node index.js
```

### Contributing
1. Fork the repo
2. Create feature branch
3. Submit pull request

---

## Why MCP?

MCP (Model Context Protocol) is a standard way to connect AI assistants to external tools and data sources. Benefits:

- **Universal:** Works with any MCP-compatible LLM
- **Secure:** Local execution, no cloud dependencies
- **Extensible:** Easy to add new tools
- **Standardized:** Follow established protocol

Learn more: [modelcontextprotocol.io](https://modelcontextprotocol.io/)

---

## License

MIT License - See [LICENSE](LICENSE) file

---

## Support

- 📖 Read the docs: [LLM_GUIDE.md](LLM_GUIDE.md)
- 💬 Issues: [GitHub Issues](https://github.com/sushiionwest/Uno-R3-MCP/issues)
- 📧 Email: williamevictor@email.com

---

## Roadmap

- [ ] Publish to npm
- [ ] Add support for I2C/SPI communication
- [ ] Built-in data visualization
- [ ] Multi-board simultaneous connections
- [ ] Cloud data sync
- [ ] Web dashboard

---

## Credits

Built for the aerospace testing community and makers worldwide.

Powered by:
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [SerialPort](https://serialport.io/)
- [Node.js](https://nodejs.org/)

---

**Ready to connect your Arduino to AI? Start with [INSTALL.md](INSTALL.md)**
