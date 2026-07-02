# Uno-R3-MCP

[![CI](https://github.com/sushiionwest/Uno-R3-MCP/actions/workflows/ci.yml/badge.svg)](https://github.com/sushiionwest/Uno-R3-MCP/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

I built this MCP server so Claude can run my rocket-motor thrust stand: an
Arduino Uno R3 reading an HX711 load-cell amplifier, streaming CSV over
serial. The server gives any MCP client ten tools covering the whole loop --
find the board, flash the sketch with arduino-cli, start the test, and read
the data back. It also has a fully deterministic mock mode, so you can try
every tool (and I can test every tool in CI) without an Arduino on the desk.

## Demo

<!-- Thrust-test video goes here: recorded on the real hardware (Uno R3 + HX711 + load-cell thrust stand). -->

## Quick start

```bash
git clone https://github.com/sushiionwest/Uno-R3-MCP
cd Uno-R3-MCP
npm install
npm test        # full suite, runs against mock mode, zero hardware
npm run smoke   # MCP handshake + simulated thrust test, prints the transcript
```

Requires Node 18+. The serial tools work as-is; the `detect_boards`,
`compile_sketch`, `upload_sketch`, and `compile_and_upload` tools additionally
need [arduino-cli](https://arduino.github.io/arduino-cli/) (see
[Environment variables](#environment-variables)).

## Hooking it up to Claude

### Claude Desktop

Add to `claude_desktop_config.json` (Windows:
`%APPDATA%\Claude\claude_desktop_config.json`, macOS:
`~/Library/Application Support/Claude/claude_desktop_config.json`). Note the
doubled backslashes -- JSON requires them:

```json
{
  "mcpServers": {
    "arduino": {
      "command": "node",
      "args": ["C:\\Users\\you\\dev\\Uno-R3-MCP\\index.js"]
    }
  }
}
```

No hardware? Run it in mock mode instead:

```json
{
  "mcpServers": {
    "arduino-mock": {
      "command": "node",
      "args": ["C:\\Users\\you\\dev\\Uno-R3-MCP\\index.js", "--mock"]
    }
  }
}
```

### Claude Code

```bash
# Real hardware
claude mcp add arduino -- node C:\Users\you\dev\Uno-R3-MCP\index.js

# Mock mode
claude mcp add arduino-mock --env MCP_MOCK_SERIAL=1 -- node C:\Users\you\dev\Uno-R3-MCP\index.js
```

Then ask Claude something like:

```
List my serial ports, connect to the Arduino, send START, and summarize the thrust curve.
```

## Tools

| Tool | Arguments | What it does | In mock mode |
|------|-----------|--------------|--------------|
| `list_serial_ports` | none | Lists serial ports with manufacturer/VID/PID metadata | Returns one fake Uno on COM7, labeled simulated |
| `connect_arduino` | `port` (required), `baudRate` (default 9600) | Opens the port and buffers incoming lines (last 1000, timestamped) | Connects to a simulated board that mirrors `examples/thrust_test.ino` |
| `read_serial_data` | `port` (required), `lines` (default 50), `clear` (default false) | Returns recent buffered lines | Same, from the deterministic simulated stream |
| `send_serial_data` | `port`, `data` (both required) | Writes a line to the port | Simulated sketch answers START, STOP, CALIBRATE, STATUS, SET_RATE |
| `disconnect_arduino` | `port` (required) | Closes the connection | Same, on the fake connection |
| `detect_boards` | none | `arduino-cli board list` | Returns a canned board listing, labeled simulated |
| `compile_sketch` | `sketchPath` (required), `fqbn` (default `arduino:avr:uno`) | `arduino-cli compile` | Validates arguments, then reports the exact command it would have run |
| `upload_sketch` | `sketchPath`, `port` (required), `fqbn` | `arduino-cli upload`; frees the serial port first | Reports the command instead of running it |
| `compile_and_upload` | `sketchPath`, `port` (required), `fqbn` | Compile then upload in one step | Reports both commands |
| `create_sketch` | `sketchName` (required), `sketchCode`, `basePath` (default `~/arduino-sketches`) | Creates `<name>/<name>.ino`, template code if none given | Runs for real -- it is filesystem-only -- and says so in the response |

Every response in mock mode is prefixed with
`[SIMULATED - mock mode, no hardware]` so simulated data can never be mistaken
for a real test.

## Mock mode

`MCP_MOCK_SERIAL=1` (or the `--mock` flag) runs the entire server with zero
hardware -- serialport's native bindings are not even loaded. The simulated
board speaks the same protocol as `examples/thrust_test.ino`: boot banner,
command handling, and on START a ~2 second motor burn streamed as
`time_s,thrust_N,temp_C` CSV at 10 Hz -- ignition ramp to a ~144 N peak,
regressive burn down to ~110 N, quadratic tail-off, burnout.

The stream is deterministic. Sensor noise comes from a fixed-seed mulberry32
PRNG re-seeded on every START, and nothing is derived from the clock, so two
runs on two machines produce byte-identical output. The test suite pins exact
sample values and verifies cross-process identity. `MCP_MOCK_EMIT_MS` changes
how fast lines are emitted (the tests use 5 ms), but never changes the data.

## Environment variables

| Variable | Effect |
|----------|--------|
| `MCP_MOCK_SERIAL=1` | Run in mock mode (equivalent to the `--mock` flag) |
| `MCP_MOCK_EMIT_MS` | Pacing of simulated data lines in ms (default 100); affects timing only |
| `ARDUINO_CLI_PATH` | Full path to the arduino-cli binary; defaults to `arduino-cli` on PATH |

If arduino-cli cannot be found, the compile/upload/detect tools fail with an
error that tells you to install it or set `ARDUINO_CLI_PATH`. On Windows the
Arduino IDE bundles it at
`C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe`
if you would rather point at that than install it separately.

## The thrust-test sketch

`examples/thrust_test.ino` is the firmware side: it reads an HX711 load-cell
amplifier (DOUT on pin 3, SCK on pin 2) and answers serial commands --
`START`, `STOP`, `CALIBRATE`, `STATUS`, and `SET_RATE <ms>`. During a test it
streams `time_s,thrust_N,temp_C` CSV at 10 Hz. The sketch ships with its own
simulation mode enabled so you can flash it and see data before wiring the
load cell; the HX711 lines to uncomment are marked.

## Development

```bash
npm test
```

The suite spawns the actual server binary and talks MCP to it over stdio:
handshake, tools/list, connect/read/write/disconnect round trips,
compile-tool argument validation, and a check that the simulated burn is
byte-identical across two independent server processes. CI runs it on Node 20
and 22.

## Hardware notes

What I actually run this against: an Uno R3-class board on Windows 11, HX711
plus load cell on the thrust stand. Anything that enumerates as a serial port
should work, but that is the setup I have personally verified.

- Close the Arduino IDE's serial monitor before connecting -- it locks the
  COM port.
- Clone boards with a CH340 USB chip need the
  [CH340 driver](https://sparks.gogo.co.nz/ch340.html) on Windows.

## npm

The package is prepared for npm under the name `uno-r3-mcp` (the name
`arduino-mcp-server` is already taken on the registry). It is not published
yet; until it is, use the git clone instructions above.

## License

MIT -- see [LICENSE](LICENSE).

William Victor ([sushiionwest](https://github.com/sushiionwest)) --
williamevictor@gmail.com
