# LLM Prompt Templates

Quick-copy prompts for users to get started immediately with any LLM using this MCP server.

---

## Template 1: Initial Connection

```
Find my Arduino and connect to it. Then show me what data it's currently sending.
```

**What the LLM will do:**
1. List serial ports
2. Identify Arduino (usually highest COM number or vendor ID 2341)
3. Connect at 9600 baud
4. Read recent data
5. Show you formatted output

---

## Template 2: Run Thrust Test

```
Run my rocket motor thrust test. Start the test, monitor it in real-time, and when complete, analyze the results. I need: peak thrust, average thrust, total impulse, and burn time.
```

**What the LLM will do:**
1. Connect to Arduino
2. Send START command
3. Monitor data every few seconds
4. Detect completion
5. Calculate all metrics
6. Provide detailed analysis

---

## Template 3: Continuous Monitoring

```
Connect to my Arduino and monitor the thrust readings. Alert me if thrust exceeds 200N or drops to zero unexpectedly.
```

**What the LLM will do:**
1. Establish connection
2. Read data continuously
3. Watch for threshold violations
4. Alert you immediately if conditions met

---

## Template 4: Data Export

```
Read all the data from my Arduino thrust test and export it as a CSV file I can open in Excel.
```

**What the LLM will do:**
1. Connect and read all buffered data
2. Format as proper CSV with headers
3. Provide file content you can save

---

## Template 5: Calibration

```
Help me calibrate my thrust test setup. Guide me through the process.
```

**What the LLM will do:**
1. Send CALIBRATE command
2. Wait for confirmation
3. Instruct you on next steps
4. Verify calibration success

---

## Template 6: Troubleshooting

```
My Arduino isn't showing any data. Help me debug the connection.
```

**What the LLM will do:**
1. List all available ports
2. Try connecting to each Arduino-like port
3. Test different baud rates
4. Check if data is flowing
5. Suggest fixes based on findings

---

## Template 7: Custom Sampling Rate

```
Connect to my Arduino and change the sampling rate to 50ms for higher resolution data collection.
```

**What the LLM will do:**
1. Connect to Arduino
2. Send "SET_RATE 50" command
3. Confirm new rate
4. Start collecting at new rate

---

## Template 8: Compare Multiple Tests

```
I'm going to run 3 thrust tests. For each one, collect the data and then compare all three tests showing which had the highest peak thrust and best performance.
```

**What the LLM will do:**
1. Run first test → collect data → save
2. Run second test → collect data → save
3. Run third test → collect data → save
4. Analyze all three datasets
5. Create comparison table
6. Recommend best configuration

---

## Template 9: Safety Check

```
Before I run my test, verify the Arduino is responding correctly and the load cell is zeroed.
```

**What the LLM will do:**
1. Connect to Arduino
2. Send STATUS command
3. Check baseline readings (should be ~0)
4. Confirm system ready
5. Give go/no-go decision

---

## Template 10: Real-time Graph Description

```
During my thrust test, describe what the thrust curve looks like as it's happening. Tell me if it looks normal for a rocket motor.
```

**What the LLM will do:**
1. Start test
2. Read data in real-time
3. Describe curve shape as it develops
4. Compare to expected thrust profile
5. Flag any anomalies

---

## Advanced Prompts

### Statistical Analysis
```
Run my thrust test and provide a complete statistical analysis including mean, median, standard deviation, confidence intervals, and any outliers in the data.
```

### Performance Optimization
```
I'm testing different nozzle designs. Run a test for each configuration and tell me which one produces the most efficient thrust profile.
```

### Data Validation
```
Check my thrust test data for errors, noise, or invalid readings. Clean the dataset and explain what you removed and why.
```

### Automated Testing
```
Run 10 consecutive thrust tests with 30 second breaks between each. Save all data and provide average performance metrics across all tests.
```

---

## Integration with Other Tools

### Export for Analysis Software
```
Get my thrust test data and format it for import into MATLAB/Python/R for further analysis.
```

### Create Test Report
```
Run my thrust test and create a professional test report including: test parameters, environmental conditions, results summary, graphs descriptions, and conclusions.
```

---

## One-Line Quick Commands

| Goal | Prompt |
|------|--------|
| Quick connection test | `Can you read my Arduino?` |
| Start test | `Start the thrust test` |
| Stop test | `Stop the test and show results` |
| Export data | `Export all data as CSV` |
| Check status | `Is the Arduino working?` |
| Find port | `Which port is my Arduino on?` |
| Reset | `Disconnect and reconnect` |
| Live monitoring | `Monitor thrust in real-time` |

---

## Context-Setting Prompts

For better results, give the LLM context upfront:

```
I'm testing a model rocket motor. The expected burn time is 3-5 seconds with peak thrust around 150N. My Arduino is running thrust_test.ino and outputs CSV format data. Please connect and run the test, then analyze if the motor performed as expected.
```

This helps the LLM:
- Know what to expect
- Set appropriate thresholds
- Provide relevant analysis
- Flag deviations from expected performance

---

## Multi-Step Workflows

### Full Test Sequence
```
1. Connect to my Arduino
2. Verify it's ready (check status)
3. Start the thrust test
4. Monitor in real-time
5. When complete, calculate all performance metrics
6. Export data as CSV
7. Provide recommendations for next test
```

### Iterative Improvement
```
I'm going to run multiple tests while adjusting parameters. For each test:
- Collect data
- Calculate peak thrust and total impulse
- Tell me if it improved from the last test
- Suggest what to adjust next
```

---

## Error Recovery Prompts

```
The connection was lost during my test. Can you reconnect and recover any data that's still in the buffer?
```

```
The data looks corrupted. Can you try different baud rates until it looks correct?
```

```
I got an error. Can you diagnose what went wrong and fix it?
```

---

## Tips for Best Results

1. **Be specific about expected behavior** - "3 second burn" vs "short test"
2. **Mention data format if known** - "CSV format" vs "some kind of data"
3. **State your analysis needs upfront** - "I need peak thrust" vs waiting until after
4. **Provide context** - "Model rocket motor" vs generic "test"
5. **Ask for explanations** - "Explain the results" vs just numbers

---

These templates work with any LLM that has access to this MCP server. Copy, paste, and customize for your specific needs.
