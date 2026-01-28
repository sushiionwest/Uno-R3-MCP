# Installation Guide - Arduino MCP Server

## Quick Install (3 Steps)

### Step 1: Install the Server

```bash
git clone https://github.com/sushiionwest/Uno-R3-MCP
cd arduino-mcp-server
npm install
```

Or install globally via npm (when published):
```bash
npm install -g arduino-mcp-server
```

### Step 2: Configure Your LLM

#### For Claude Code:

1. Find your config file:
   - **Windows:** `%APPDATA%\Claude Code\claude_desktop_config.json`
   - **Mac:** `~/Library/Application Support/Claude Code/claude_desktop_config.json`
   - **Linux:** `~/.config/claude-code/claude_desktop_config.json`

2. Add this configuration:

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

**Important:** Update the path to match where you installed the server!

#### For Other LLMs:

Check your LLM's MCP server documentation. You'll need to point it to:
- **Command:** `node`
- **Args:** `["/path/to/arduino-mcp-server/index.js"]`

### Step 3: Restart Your LLM

Completely close and reopen your LLM application (Claude Code, etc.)

---

## Verify Installation

After restart, test with this prompt:

```
List all available serial ports and show me which one is my Arduino.
```

You should see the LLM use the `list_serial_ports` tool and identify your Arduino.

---

## Test with Example Sketch

1. Upload `examples/thrust_test.ino` to your Arduino
2. Connect Arduino to computer via USB
3. Tell your LLM: "Connect to my Arduino and start reading data"

---

## Troubleshooting

### "No ports found"
- Check Arduino is plugged in
- Install Arduino drivers (CH340 for clones, official Arduino drivers for genuine boards)
- On Linux: Add user to `dialout` group: `sudo usermod -a -G dialout $USER`

### "Connection failed"
- Close Arduino IDE (it locks the COM port)
- Try different baud rates: 9600, 115200
- Check Arduino sketch is uploaded and running

### "MCP server not found"
- Verify path in config file is correct
- Use absolute paths (not relative)
- On Windows, use double backslashes: `C:\path\to\server`

### "Permission denied"
- On Linux/Mac: `chmod +x index.js`
- Run: `npm test` to check installation

---

## Windows-Specific Setup

### PowerShell Script (Run as Administrator)

Save as `setup-arduino-mcp.ps1`:

```powershell
# Install Node.js if needed
winget install OpenJS.NodeJS

# Clone and install server
cd C:\
git clone https://github.com/sushiionwest/Uno-R3-MCP
cd arduino-mcp-server
npm install

# Create config directory if needed
$configPath = "$env:APPDATA\Claude Code"
New-Item -ItemType Directory -Force -Path $configPath

# Update config (backs up existing)
$configFile = "$configPath\claude_desktop_config.json"
if (Test-Path $configFile) {
    Copy-Item $configFile "$configFile.backup"
}

$config = @{
    mcpServers = @{
        arduino = @{
            command = "node"
            args = @("C:\arduino-mcp-server\index.js")
        }
    }
} | ConvertTo-Json -Depth 3

Set-Content -Path $configFile -Value $config

Write-Host "Setup complete! Restart Claude Code to use Arduino MCP server."
```

Run:
```powershell
.\setup-arduino-mcp.ps1
```

---

## Mac/Linux Setup Script

Save as `setup-arduino-mcp.sh`:

```bash
#!/bin/bash

# Install to home directory
cd ~
git clone https://github.com/sushiionwest/Uno-R3-MCP
cd arduino-mcp-server
npm install

# Determine config path
if [[ "$OSTYPE" == "darwin"* ]]; then
    CONFIG_DIR="$HOME/Library/Application Support/Claude Code"
else
    CONFIG_DIR="$HOME/.config/claude-code"
fi

mkdir -p "$CONFIG_DIR"
CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"

# Backup existing config
if [ -f "$CONFIG_FILE" ]; then
    cp "$CONFIG_FILE" "$CONFIG_FILE.backup"
fi

# Create new config
cat > "$CONFIG_FILE" << 'ENDCONFIG'
{
  "mcpServers": {
    "arduino": {
      "command": "node",
      "args": ["$HOME/arduino-mcp-server/index.js"]
    }
  }
}
ENDCONFIG

# Make executable
chmod +x index.js

echo "Setup complete! Restart Claude Code to use Arduino MCP server."
```

Run:
```bash
chmod +x setup-arduino-mcp.sh
./setup-arduino-mcp.sh
```

---

## Uninstall

### Remove Server
```bash
cd arduino-mcp-server
cd ..
rm -rf arduino-mcp-server
```

### Remove Config
Edit your LLM's config file and remove the `arduino` entry from `mcpServers`.

---

## Updating

```bash
cd arduino-mcp-server
git pull
npm install
```

Restart your LLM.

---

## Advanced: Multiple Arduinos

To support multiple Arduino devices simultaneously:

```json
{
  "mcpServers": {
    "arduino-primary": {
      "command": "node",
      "args": ["/path/to/arduino-mcp-server/index.js"]
    },
    "arduino-secondary": {
      "command": "node",
      "args": ["/path/to/arduino-mcp-server/index.js"]
    }
  }
}
```

Each instance maintains separate connections.

---

## Developer Mode

For development and testing:

```bash
# Run in debug mode
DEBUG=* node index.js

# Run tests
npm test

# Watch for changes
nodemon index.js
```

---

## Next Steps

1. ✓ Install server
2. ✓ Configure LLM
3. ✓ Restart LLM
4. → Upload Arduino sketch (see `examples/thrust_test.ino`)
5. → Start testing! (see `PROMPT_TEMPLATES.md`)

For help, see:
- `README.md` - Overview
- `LLM_GUIDE.md` - For AI assistants
- `PROMPT_TEMPLATES.md` - Example prompts
