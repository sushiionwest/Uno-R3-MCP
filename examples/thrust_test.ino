/**
 * Arduino Thrust Test Data Logger
 *
 * For aerospace rocket motor thrust testing
 * Reads load cell via HX711 amplifier and sends data over serial
 *
 * Compatible with: Arduino Uno, Elegoo Uno R3, Nano, Mega
 *
 * Hardware Connections:
 * - HX711 DOUT -> Pin 3
 * - HX711 SCK  -> Pin 2
 * - HX711 VCC  -> 5V
 * - HX711 GND  -> GND
 * - Load Cell  -> HX711 (E+, E-, A+, A-)
 */

// If you don't have HX711 library, install it via Arduino IDE Library Manager
// For testing without hardware, see simulation mode below

#define DOUT_PIN 3
#define SCK_PIN 2

// Calibration factor - adjust based on your load cell
// Run calibration sketch first to find this value
float calibration_factor = 2280.0;

// Sampling rate (milliseconds between readings)
int sample_rate = 100; // 10 Hz default

bool test_running = false;
unsigned long test_start_time = 0;
unsigned long last_reading_time = 0;

void setup() {
  Serial.begin(9600);

  // Initialize load cell
  // Uncomment if using HX711:
  // scale.begin(DOUT_PIN, SCK_PIN);
  // scale.set_scale(calibration_factor);
  // scale.tare();

  Serial.println("Arduino Thrust Test System v1.0");
  Serial.println("Commands: START, STOP, CALIBRATE, STATUS");
  Serial.println("READY");
}

void loop() {
  // Check for commands from computer
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    handleCommand(command);
  }

  // If test is running, take readings
  if (test_running) {
    unsigned long current_time = millis();

    if (current_time - last_reading_time >= sample_rate) {
      last_reading_time = current_time;

      // Read thrust value
      float thrust = readThrust();

      // Calculate time since test start
      float elapsed_time = (current_time - test_start_time) / 1000.0;

      // Send data in CSV format: time,thrust,temperature
      Serial.print(elapsed_time, 3);
      Serial.print(",");
      Serial.print(thrust, 2);
      Serial.print(",");
      Serial.println(readTemperature(), 1);
    }
  }
}

void handleCommand(String cmd) {
  if (cmd == "START") {
    test_running = true;
    test_start_time = millis();
    last_reading_time = 0;
    Serial.println("TEST_STARTED");
    Serial.println("time_s,thrust_N,temp_C");

  } else if (cmd == "STOP") {
    test_running = false;
    Serial.println("TEST_STOPPED");

  } else if (cmd == "CALIBRATE") {
    Serial.println("CALIBRATING");
    // Tare the scale
    // Uncomment if using HX711:
    // scale.tare();
    delay(1000);
    Serial.println("CALIBRATION_COMPLETE");

  } else if (cmd == "STATUS") {
    if (test_running) {
      Serial.println("STATUS: RUNNING");
    } else {
      Serial.println("STATUS: READY");
    }

  } else if (cmd.startsWith("SET_RATE")) {
    // Parse sample rate from command like "SET_RATE 50"
    int new_rate = cmd.substring(9).toInt();
    if (new_rate >= 10 && new_rate <= 1000) {
      sample_rate = new_rate;
      Serial.print("SAMPLE_RATE_SET: ");
      Serial.println(sample_rate);
    } else {
      Serial.println("ERROR: Rate must be 10-1000 ms");
    }

  } else {
    Serial.print("UNKNOWN_COMMAND: ");
    Serial.println(cmd);
  }
}

float readThrust() {
  // SIMULATION MODE - for testing without hardware
  // Simulates a small rocket motor thrust curve
  if (test_running) {
    float t = (millis() - test_start_time) / 1000.0;

    // Simulated thrust curve (Newton-seconds)
    if (t < 0.5) {
      // Ignition spike
      return 50.0 + random(-5, 5);
    } else if (t < 3.0) {
      // Burn phase
      return 120.0 + random(-10, 10);
    } else if (t < 3.5) {
      // Tail-off
      return 80.0 - (t - 3.0) * 100 + random(-5, 5);
    } else {
      // Burnout
      return 0.0 + random(-2, 2);
    }
  }

  // REAL HARDWARE MODE - uncomment when connected to load cell
  // return scale.get_units() * 9.81; // Convert kg to Newtons

  return 0.0;
}

float readTemperature() {
  // SIMULATION MODE
  return 23.5 + random(-5, 5) / 10.0;

  // REAL HARDWARE MODE - if you have temperature sensor
  // return analogRead(A0) * 0.48828125; // For TMP36
}

/**
 * HARDWARE SETUP GUIDE
 *
 * Load Cell Wiring (via HX711):
 * 1. Red wire (E+) -> HX711 E+
 * 2. Black wire (E-) -> HX711 E-
 * 3. White wire (A-) -> HX711 A-
 * 4. Green wire (A+) -> HX711 A+
 *
 * HX711 to Arduino:
 * - VCC -> 5V
 * - GND -> GND
 * - DT/DOUT -> Pin 3
 * - SCK -> Pin 2
 *
 * CALIBRATION PROCESS:
 * 1. Upload this sketch
 * 2. Send "CALIBRATE" command with no weight
 * 3. Place known weight (e.g., 1 kg)
 * 4. Adjust calibration_factor until reading is correct
 * 5. Save calibration_factor value
 *
 * SAFETY NOTES:
 * - Secure load cell and test stand properly
 * - Use appropriate load cell rating (e.g., 50 kg for small motors)
 * - Stand clear during tests
 * - Monitor for overload conditions
 */
