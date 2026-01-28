# LLM Quick Start Guide - Arduino MCP Server

This guide helps AI assistants (LLMs) quickly understand and use this Arduino MCP server.

## What This Server Does

Enables LLMs to communicate with Arduino boards over serial/USB connection for reading sensor data, controlling hardware, and running experiments.

## Available Tools (5 total)

### 1. `list_serial_ports`
**Purpose:** Find which COM port the Arduino is connected to
**Parameters:** None
**Returns:** JSON array of available ports with manufacturer info
**When to use:** First step - always run this to locate the Arduino

```json
Example response:
[
  {
    "path": "COM3",
    "manufacturer": "Arduino LLC",
    "vendorId": "2341",
    "productId": "0043"
  }
]
```

**LLM Action:** Look for ports with Arduino/Elegoo manufacturer or vendor ID 2341

---

### 2. `connect_arduino`
**Purpose:** Open serial connection to Arduino
**Parameters:**
- `port` (required): COM port name (e.g., "COM3")
- `baudRate` (optional): Default 9600, common: 115200

**Returns:** Connection confirmation
**When to use:** After identifying port, before reading data

```json
{
  "port": "COM3",
  "baudRate": 9600
}
```

**Important:** Connection starts buffering data immediately (keeps last 1000 lines)

---

### 3. `read_serial_data`
**Purpose:** Retrieve buffered data from Arduino
**Parameters:**
- `port` (required): COM port to read from
- `lines` (optional): Number of recent lines (default 50, max 1000)

**Returns:** JSON array with timestamps and data

```json
Example response:
[
  {
    "timestamp": "2025-01-11T12:34:56.789Z",
    "data": "Thrust: 125.3 N"
  },
  {
    "timestamp": "2025-01-11T12:34:57.889Z",
    "data": "Thrust: 126.1 N"
  }
]
```

**When to use:**
- Continuously during experiments to monitor live data
- After test completion to retrieve full dataset
- When user asks "what is the Arduino reading?"

---

### 4. `send_serial_data`
**Purpose:** Send commands/data to Arduino
**Parameters:**
- `port` (required): COM port
- `data` (required): String to send (newline added automatically)

**Returns:** Confirmation of sent data
**When to use:**
- Starting/stopping tests (e.g., "START", "STOP")
- Changing settings (e.g., "SET_SAMPLE_RATE 100")
- Triggering calibration

```json
{
  "port": "COM3",
  "data": "START_TEST"
}
```

---

### 5. `disconnect_arduino`
**Purpose:** Close serial connection
**Parameters:**
- `port` (required): COM port to close

**Returns:** Disconnection confirmation
**When to use:**
- After completing all operations
- Before connecting to different port
- If errors occur and reconnection needed

---

## Typical Workflows

### Workflow 1: Initial Setup
```
1. list_serial_ports → Find Arduino on COM3
2. connect_arduino (port: COM3, baudRate: 9600) → Establish connection
3. read_serial_data (port: COM3, lines: 10) → Check if data is flowing
```

### Workflow 2: Run Experiment
```
1. send_serial_data (data: "START") → Begin test
2. read_serial_data (lines: 50) → Monitor every few seconds
3. send_serial_data (data: "STOP") → End test
4. read_serial_data (lines: 1000) → Retrieve all data
5. Analyze data and present results
```

### Workflow 3: Thrust Test Analysis
```
1. Connect to Arduino
2. Send "CALIBRATE" command
3. Wait for "READY" response
4. Send "START_THRUST_TEST"
5. Poll read_serial_data every 1-2 seconds
6. When test complete, retrieve full dataset
7. Parse data (expect format: "timestamp,thrust_N,temp_C")
8. Calculate: peak thrust, average thrust, burn time, total impulse
9. Generate graphs and analysis report
```

---

## Data Format Expectations

### Common Arduino Output Formats

**CSV Format:**
```
timestamp,thrust,temperature
1000,45.2,23.5
1100,67.8,24.1
```

**Key-Value Format:**
```
Thrust: 45.2 N
Temp: 23.5 C
```

**JSON Format:**
```json
{"t":1000,"thrust":45.2,"temp":23.5}
```

**LLM Action:** Parse based on actual format observed. Ask user if format is unclear.

---

## Error Handling

### Port Not Found
- **Symptom:** list_serial_ports returns empty or doesn't show Arduino
- **Action:** Tell user to check USB connection and driver installation

### Connection Failed
- **Symptom:** connect_arduino fails
- **Action:** Port may be in use. Try disconnect_arduino first, then reconnect

### No Data Received
- **Symptom:** read_serial_data returns empty array
- **Action:**
  1. Check Arduino sketch is running
  2. Verify correct baud rate
  3. Send command to trigger output

### Garbled Data
- **Symptom:** Data has weird characters
- **Action:** Wrong baud rate - try 115200, 57600, or 19200

---

## Analysis Capabilities

When data is retrieved, LLMs should automatically:

1. **Parse and structure** raw data into usable format
2. **Validate** data quality (check for gaps, outliers, errors)
3. **Calculate metrics:**
   - For thrust tests: peak thrust, average thrust, total impulse, burn time
   - For sensors: min/max/avg, standard deviation, trends
4. **Visualize** data (describe graphs or export CSV for plotting)
5. **Report findings** with confidence intervals and uncertainty

---

## Quick Command Reference

```
Find Arduino:        list_serial_ports
Connect:            connect_arduino {"port": "COM3"}
Read data:          read_serial_data {"port": "COM3", "lines": 100}
Send command:       send_serial_data {"port": "COM3", "data": "START"}
Disconnect:         disconnect_arduino {"port": "COM3"}
```

---

## Baud Rate Guide

| Baud Rate | Use Case |
|-----------|----------|
| 9600      | Default, simple sensors, debugging |
| 19200     | Faster simple data |
| 57600     | Multiple sensors |
| 115200    | High-speed data logging, IMUs |
| 250000    | Very high speed (3D printers) |

**LLM Note:** If data looks corrupted, try different baud rates

---

## Pro Tips for LLMs

1. **Always start with list_serial_ports** - Never assume port name
2. **Buffer data continuously** - Connection starts buffering immediately
3. **Use timestamps** - Each reading includes ISO timestamp for analysis
4. **Parse flexibly** - Arduino output format varies, adapt to what you see
5. **Monitor during tests** - Read data periodically to catch issues early
6. **Calculate metrics automatically** - Users expect analysis, not just raw data
7. **Suggest improvements** - If data is noisy or incomplete, tell user how to improve

---

## Common User Requests → Actions

| User Says | LLM Does |
|-----------|----------|
| "Read my Arduino" | list_ports → connect → read_data |
| "Start the test" | send_data "START" → poll read_data |
| "What's the max thrust?" | Parse data → calculate max → report |
| "Export the data" | Format as CSV with headers |
| "Is it working?" | read_data → check for recent timestamps |
| "Calibrate" | send_data "CALIBRATE" → monitor response |

---

## Example LLM Response Flow

**User:** "Run my thrust test and analyze it"

**LLM Actions:**
1. List ports → Found COM3
2. Connect to COM3 at 9600 baud → Connected
3. Send "START" → Test started
4. Read data every 2s → Monitoring...
5. Detect "TEST_COMPLETE" in output → Test finished
6. Read all 1000 lines → Retrieved dataset
7. Parse thrust values → Extracted 500 readings
8. Calculate metrics:
   - Peak thrust: 145.2 N at t=3.4s
   - Average thrust: 98.7 N
   - Burn time: 5.2s
   - Total impulse: 513 N·s
9. Report findings with confidence

**User sees:** Professional analysis with actionable insights

---

This server makes Arduino data accessible to any LLM with minimal prompting required.
