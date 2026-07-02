import test from "node:test";
import assert from "node:assert/strict";
import {
  generateBurnSamples,
  thrustCurveN,
  mulberry32,
  MOCK_PORT_LIST,
} from "../mock-serial.js";

test("generateBurnSamples is deterministic", () => {
  assert.deepEqual(generateBurnSamples(), generateBurnSamples());
});

test("burn samples match the pinned deterministic values", () => {
  const samples = generateBurnSamples();
  assert.equal(samples.length, 25);
  // These exact strings are the point: the stream is byte-identical on
  // every run, on every machine.
  assert.equal(samples[0], "0.000,0.13,23.4");
  assert.equal(samples[3], "0.300,144.44,23.8");
  assert.equal(samples[24], "2.400,0.23,25.8");
});

test("burn samples follow the sketch's CSV format and a plausible curve", () => {
  const samples = generateBurnSamples();
  for (const line of samples) {
    assert.match(line, /^\d+\.\d{3},\d+\.\d{2},\d+\.\d$/);
  }

  const thrust = samples.map((line) => Number(line.split(",")[1]));
  const peak = Math.max(...thrust);

  // Ramp: starts near zero, peaks at t = 0.3 s
  assert.ok(thrust[0] < 1);
  assert.equal(thrust.indexOf(peak), 3);
  assert.ok(peak > 140 && peak < 150);

  // Tail-off: burnout samples are near zero
  assert.ok(thrust[24] < 1);
});

test("thrustCurveN boundary behavior", () => {
  assert.equal(thrustCurveN(-1), 0);
  assert.equal(thrustCurveN(0), 0);
  assert.equal(thrustCurveN(0.3), 145);
  assert.equal(thrustCurveN(2.0), 0);
  assert.equal(thrustCurveN(10), 0);
});

test("mulberry32 gives the same sequence for the same seed", () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 10; i++) {
    assert.equal(a(), b());
  }
});

test("mock port list is labeled as simulated", () => {
  assert.equal(MOCK_PORT_LIST.length, 1);
  assert.equal(MOCK_PORT_LIST[0].path, "COM7");
  assert.match(MOCK_PORT_LIST[0].manufacturer, /simulated/i);
});
