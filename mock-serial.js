/**
 * Deterministic mock of an Arduino Uno R3 running examples/thrust_test.ino.
 *
 * Used when the server runs in mock mode (MCP_MOCK_SERIAL=1 or --mock) so the
 * entire toolchain can be exercised with zero hardware. The simulated serial
 * stream mirrors the sketch's protocol: a boot banner, START/STOP/CALIBRATE/
 * STATUS/SET_RATE command handling, and CSV data lines in the format
 * time_s,thrust_N,temp_C.
 *
 * Everything here is deterministic. Noise comes from a fixed-seed mulberry32
 * PRNG that is re-seeded on every START, so two runs of the simulated burn
 * produce byte-identical output. Nothing is seeded from the clock.
 */

// Fixed PRNG seed. Never derived from time.
const MOCK_SEED = 0x5eed;

// Nominal sample period of the simulated sketch (matches thrust_test.ino's
// 10 Hz default). The CSV time column advances by this amount per line
// regardless of how fast lines are actually emitted.
const SAMPLE_MS = 100;

// Simulated burn duration in seconds (~2 s burn plus a short burnout tail).
const BURN_DURATION_S = 2.4;

// The single fake port that list_serial_ports reports in mock mode.
export const MOCK_PORT_LIST = [
  {
    path: "COM7",
    manufacturer: "Mock Elegoo Uno R3 (simulated)",
    serialNumber: "MOCK0001",
    productId: "0043",
    vendorId: "2341",
  },
];

// What detect_boards reports in mock mode (mimics arduino-cli board list).
export const MOCK_BOARD_LIST_TEXT = [
  "Port Type              Board Name  FQBN            Core",
  "COM7 Serial Port (USB) Arduino Uno arduino:avr:uno arduino:avr",
  "",
].join("\n");

// Boot banner, mirroring the sketch's setup() output.
const BANNER_LINES = [
  "Arduino Thrust Test System v1.0 [SIMULATED]",
  "Commands: START, STOP, CALIBRATE, STATUS",
  "READY",
];

// Small deterministic PRNG (mulberry32).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Idealized ~2 s solid-motor thrust curve in Newtons (no noise):
 * - 0.0-0.3 s: ignition ramp up to the 145 N peak
 * - 0.3-1.5 s: regressive burn declining to 110 N
 * - 1.5-2.0 s: quadratic tail-off to zero
 * - after 2.0 s: burnout
 */
export function thrustCurveN(t) {
  if (t < 0) return 0;
  if (t < 0.3) return (t / 0.3) * 145.0;
  if (t < 1.5) return 145.0 - ((t - 0.3) / 1.2) * 35.0;
  if (t < 2.0) {
    const k = (t - 1.5) / 0.5;
    return 110.0 * (1 - k) * (1 - k);
  }
  return 0;
}

/**
 * Generate the full simulated burn as CSV lines in the sketch's data format
 * (time_s,thrust_N,temp_C). Pure function of the fixed seed: every call
 * returns the identical array.
 */
export function generateBurnSamples() {
  const rand = mulberry32(MOCK_SEED);
  const lines = [];
  const count = Math.round((BURN_DURATION_S * 1000) / SAMPLE_MS) + 1;

  for (let i = 0; i < count; i++) {
    const t = (i * SAMPLE_MS) / 1000;
    const base = thrustCurveN(t);
    const noise = (rand() - 0.5) * 3.0; // +/- 1.5 N sensor noise
    const thrust = base > 0 ? Math.max(0, base + noise) : Math.abs(noise) * 0.2;
    // Ambient 23.5 C warming slightly during the burn, +/- 0.2 C noise
    const temp = 23.5 + Math.min(t, 2.0) * 1.2 + (rand() - 0.5) * 0.4;
    lines.push(`${t.toFixed(3)},${thrust.toFixed(2)},${temp.toFixed(1)}`);
  }

  return lines;
}

/**
 * A fake Arduino connection. Emits received lines through the onLine
 * callback, and answers writes exactly like the thrust_test.ino sketch.
 *
 * emitIntervalMs controls only the pacing of data lines during a simulated
 * burn (default: real-time at the sketch's 100 ms sample period). The data
 * itself, including the CSV time column, is independent of pacing, so tests
 * can speed up emission without changing a single byte of output.
 */
export class MockArduino {
  constructor({ onLine, emitIntervalMs = SAMPLE_MS }) {
    this.onLine = onLine;
    this.emitIntervalMs = emitIntervalMs;
    this.testRunning = false;
    this.timer = null;
    this.sampleRate = SAMPLE_MS;
  }

  // Emit the boot banner, like the sketch's setup().
  open() {
    for (const line of BANNER_LINES) {
      this.onLine(line);
    }
  }

  // Handle a command written to the "serial port".
  write(data) {
    const cmd = String(data).trim();

    if (cmd === "START") {
      this.onLine("TEST_STARTED");
      this.onLine("time_s,thrust_N,temp_C");
      this.startBurn();
    } else if (cmd === "STOP") {
      this.stopBurn();
      this.onLine("TEST_STOPPED");
    } else if (cmd === "CALIBRATE") {
      this.onLine("CALIBRATING");
      this.onLine("CALIBRATION_COMPLETE");
    } else if (cmd === "STATUS") {
      this.onLine(this.testRunning ? "STATUS: RUNNING" : "STATUS: READY");
    } else if (cmd.startsWith("SET_RATE")) {
      const newRate = parseInt(cmd.slice(9), 10);
      if (newRate >= 10 && newRate <= 1000) {
        // Acknowledged like the sketch, but the simulated data stays at the
        // nominal 100 ms sample period to remain deterministic.
        this.sampleRate = newRate;
        this.onLine(`SAMPLE_RATE_SET: ${newRate}`);
      } else {
        this.onLine("ERROR: Rate must be 10-1000 ms");
      }
    } else {
      this.onLine(`UNKNOWN_COMMAND: ${cmd}`);
    }
  }

  // Stream the deterministic burn, one line per emit interval. The stream
  // is finite: after the last sample the simulated test ends on its own.
  startBurn() {
    this.stopBurn();
    const samples = generateBurnSamples();
    let index = 0;
    this.testRunning = true;

    this.timer = setInterval(() => {
      if (index >= samples.length) {
        this.stopBurn();
        return;
      }
      this.onLine(samples[index]);
      index += 1;
    }, this.emitIntervalMs);

    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  stopBurn() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.testRunning = false;
  }

  close() {
    this.stopBurn();
  }
}
