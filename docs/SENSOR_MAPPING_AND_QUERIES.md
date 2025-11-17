# Sensor Mapping and Query Guide

Complete guide for querying VictoriaMetrics sensors using friendly names (s1-s8, t1-t30, c1-c2).

## Table of Contents

- [Overview](#overview)
- [Important Note](#important-note)
- [Sensor Inventory](#sensor-inventory)
- [Sensor Mapping](#sensor-mapping)
- [Query Examples](#query-examples)
- [Query Templates](#query-templates)
- [Sensor Types Reference](#sensor-types-reference)
- [Sample Query Results](#sample-query-results)

---

## Overview

This document provides the complete mapping between friendly sensor names (t1, s1, c1, etc.) and actual sensor IDs used in the external VictoriaMetrics database. Use this mapping to create queries for reports and data analysis.

**API Endpoint:** `https://api.iot.tidop.es/v1/vm`

---

## Important Note

✅ **The external VictoriaMetrics NOW HAS `sensor_name` label support!**

You can query using either:
- **`sensor_name`** - Friendly names like "t1", "s2", "c1" (recommended for easier queries)
- **`sensor_id`** - Device-specific IDs like "lite-a81758fffe0d2d67"

Both methods work identically. Using `sensor_name` makes queries simpler and more readable.

---

## Sensor Inventory

### Summary

- **Temperature Sensors:** 15 (t1, t4, t6, t7, t9, t11, t13, t16, t17, t18, t19, t20, t21, t22, t30)
- **Sound Sensors:** 5 (s1, s2, s3, s6, s7)
- **Current Clamp Sensors:** 2 (c1, c2)
- **Total Physical Sensors:** 22

### Sensor Capabilities

**Lite Sensors (elsys ers-lite):**
- Temperature
- Humidity
- VDD (voltage)

**Sound Sensors (elsys ers-sound):**
- Temperature
- Humidity
- Sound (Average & Peak)
- Light
- Motion
- VDD (voltage)

**Current Clamp Sensors:**
- 4 current clamps per device
- Battery voltage
- Current measurement on 4 channels

---

## Sensor Mapping

### Temperature Sensors (t1-t30)

All temperature sensors (elsys ers-lite) provide **3 sensor types**:

| Property | sensor_type | Unit | Description |
|----------|-------------|------|-------------|
| Temperature | `temperature` | °C | Ambient temperature |
| Humidity | `humidity` | % | Relative humidity |
| Voltage | `vdd` | mV | Supply voltage (battery indicator) |

**Example Values (Latest reading from t1):**

| Sensor Type | Value | Unit | Description |
|-------------|-------|------|-------------|
| temperature | 15.0 | °C | Ambient temperature |
| humidity | 60 | % | Relative humidity |
| vdd | 3684 | mV | Supply voltage |

**Available Sensors:**

| Friendly Name | Sensor ID | Model |
|---------------|-----------|-------|
| t1 | lite-a81758fffe0d4ab0 | elsys ers-lite |
| t4 | lite-a81758fffe0d4ab3 | elsys ers-lite |
| t6 | lite-a81758fffe0d4ab5 | elsys ers-lite |
| t7 | lite-a81758fffe0d4af2 | elsys ers-lite |
| t9 | lite-a81758fffe0d4af4 | elsys ers-lite |
| t11 | lite-a81758fffe0d4af6 | elsys ers-lite |
| t13 | lite-a81758fffe0d4af8 | elsys ers-lite |
| t16 | lite-a81758fffe0d4afb | elsys ers-lite |
| t17 | lite-a81758fffe0d2d67 | elsys ers-lite |
| t18 | lite-a81758fffe0d2d68 | elsys ers-lite |
| t19 | lite-a81758fffe0d2d69 | elsys ers-lite |
| t20 | lite-a81758fffe0d2d70 | elsys ers-lite |
| t21 | lite-a81758fffe0d2d6b | elsys ers-lite |
| t22 | lite-a81758fffe0d2d6c | elsys ers-lite |
| t30 | lite-a81758fffe0d2d6a | elsys ers-lite |

### Sound Sensors (s1-s7)

All sound sensors (elsys ers-sound) provide **7 sensor types**:

| Property | sensor_type | Unit | Description |
|----------|-------------|------|-------------|
| Sound Average | `soundAvg` | dB | Average sound level |
| Sound Peak | `soundPeak` | dB | Peak sound level |
| Temperature | `temperature` | °C | Ambient temperature |
| Humidity | `humidity` | % | Relative humidity |
| Light | `light` | lux | Light intensity |
| Motion | `motion` | boolean | Motion detection |
| Voltage | `vdd` | mV | Supply voltage (battery indicator) |

**Example Values (Latest reading from s1):**

| Sensor Type | Value | Unit | Description |
|-------------|-------|------|-------------|
| soundAvg | 48 | dB | Average sound level |
| soundPeak | 73 | dB | Peak sound level |
| temperature | 20.8 | °C | Ambient temperature |
| humidity | 42 | % | Relative humidity |
| light | 34 | lux | Light intensity |
| motion | 0 | boolean | Motion detection (no motion) |
| vdd | 3658 | mV | Supply voltage |

**Available Sensors:**

| Friendly Name | Sensor ID | Model |
|---------------|-----------|-------|
| s1 | sound-a81758fffe0d0432 | elsys ers-sound |
| s2 | sound-a81758fffe0d0433 | elsys ers-sound |
| s3 | sound-a81758fffe0d0434 | elsys ers-sound |
| s6 | sound-a81758fffe0d0437 | elsys ers-sound |
| s7 | sound-a81758fffe0d042e | elsys ers-sound |

### Current Clamp Sensors (c1-c2)

All current clamp sensors provide **5 sensor types**:

| Property | sensor_type | Unit | Description |
|----------|-------------|------|-------------|
| Current Clamp 1 | `current_clamp_1` | A | Current measurement channel 1 |
| Current Clamp 2 | `current_clamp_2` | A | Current measurement channel 2 |
| Current Clamp 3 | `current_clamp_3` | A | Current measurement channel 3 |
| Current Clamp 4 | `current_clamp_4` | A | Current measurement channel 4 |
| Battery Voltage | `Bat_V` | V | Battery voltage |

**Example Values (Latest reading from c1):**

| Sensor Type | Value | Unit | Description |
|-------------|-------|------|-------------|
| current_clamp_1 | 0.36 | A | Channel 1 current |
| current_clamp_2 | 0.46 | A | Channel 2 current |
| current_clamp_3 | 0.36 | A | Channel 3 current |
| current_clamp_4 | 0.17 | A | Channel 4 current |
| Bat_V | 3.246 | V | Battery voltage |

**Available Sensors:**

| Friendly Name | Sensor ID | Model |
|---------------|-----------|-------|
| c1 | cs01-a840412f375a8bd6 | current sensor |
| c2 | cs01-a84041e9eb5c3996 | current sensor |

### JSON Mapping

```json
{
  "temperature": {
    "t1": "lite-a81758fffe0d4ab0",
    "t4": "lite-a81758fffe0d4ab3",
    "t6": "lite-a81758fffe0d4ab5",
    "t7": "lite-a81758fffe0d4af2",
    "t9": "lite-a81758fffe0d4af4",
    "t11": "lite-a81758fffe0d4af6",
    "t13": "lite-a81758fffe0d4af8",
    "t16": "lite-a81758fffe0d4afb",
    "t17": "lite-a81758fffe0d2d67",
    "t18": "lite-a81758fffe0d2d68",
    "t19": "lite-a81758fffe0d2d69",
    "t20": "lite-a81758fffe0d2d70",
    "t21": "lite-a81758fffe0d2d6b",
    "t22": "lite-a81758fffe0d2d6c",
    "t30": "lite-a81758fffe0d2d6a"
  },
  "sound": {
    "s1": "sound-a81758fffe0d0432",
    "s2": "sound-a81758fffe0d0433",
    "s3": "sound-a81758fffe0d0434",
    "s6": "sound-a81758fffe0d0437",
    "s7": "sound-a81758fffe0d042e"
  },
  "clamp": {
    "c1": "cs01-a840412f375a8bd6",
    "c2": "cs01-a84041e9eb5c3996"
  }
}
```

---

## Query Examples

### 0. Get Current/Last Values for All Sensor Types (t1)

**Get all current values (temperature, humidity, vdd) for sensor t1:**

**Endpoint:** `/query`

```javascript
const url = 'https://api.iot.tidop.es/v1/vm/query';
const options = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        'authorization': 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    },
    body: JSON.stringify({
        query: 'iot_sensor_reading{sensor_name="t1"}'
    })
};

const response = await fetch(url, options);
const data = await response.json();

// Results will contain all 3 sensor types:
// data.result[0] = humidity: 60%
// data.result[1] = temperature: 15.1°C
// data.result[2] = vdd: 3684mV
```

**Get specific sensor type (temperature only):**

```javascript
{
    query: 'iot_sensor_reading{sensor_name="t1", sensor_type="temperature"}'
}
// Result: temperature = 15.1°C
```

**Get specific sensor type (humidity only):**

```javascript
{
    query: 'iot_sensor_reading{sensor_name="t1", sensor_type="humidity"}'
}
// Result: humidity = 60%
```

**Get specific sensor type (voltage only):**

```javascript
{
    query: 'iot_sensor_reading{sensor_name="t1", sensor_type="vdd"}'
}
// Result: vdd = 3684mV
```

### 1. Average Temperature for t1 (Last 20 Days)

**Endpoint:** `/query`

**Using sensor_name (Recommended):**
```javascript
const url = 'https://api.iot.tidop.es/v1/vm/query';
const options = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        'authorization': 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    },
    body: JSON.stringify({
        query: 'avg_over_time(iot_sensor_reading{sensor_name="t1", sensor_type="temperature"}[20d])',
        time: new Date().toISOString()
    })
};

const response = await fetch(url, options);
const data = await response.json();
// Result: data.result[0].values[0] = 15.1°C
```

**Using sensor_id (Alternative):**
```javascript
// Same query using sensor_id instead
query: 'avg_over_time(iot_sensor_reading{sensor_id="lite-a81758fffe0d4ab0", sensor_type="temperature"}[20d])'
```

### 2. Temperature Time Series for t1 (Last 7 Days, Hourly)

**Endpoint:** `/query_range`

```javascript
const url = 'https://api.iot.tidop.es/v1/vm/query_range';
const options = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        'authorization': 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    },
    body: JSON.stringify({
        query: 'iot_sensor_reading{sensor_name="t1", sensor_type="temperature"}',
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
        step: '1h'
    })
};

const response = await fetch(url, options);
const data = await response.json();
// Result: data.result[0].values = [14.2, 14.5, 15.1, ..., 15.8]
```

### 3. Overall Average Temperature (All Sensors, Last 24 Hours)

```javascript
{
    query: 'avg(avg_over_time(iot_sensor_reading{sensor_type="temperature"}[24h]))',
    time: new Date().toISOString()
}
// Result: 20.20°C
```

### 4. Sound Level for s2 (Last 24 Hours Average)

**Using sensor_name:**
```javascript
{
    query: 'avg_over_time(iot_sensor_reading{sensor_name="s2", sensor_type="soundAvg"}[24h])',
    time: new Date().toISOString()
}
// Result: 48.7 dB
```

**Using sensor_id:**
```javascript
{
    query: 'avg_over_time(iot_sensor_reading{sensor_id="sound-a81758fffe0d0433", sensor_type="soundAvg"}[24h])',
    time: new Date().toISOString()
}
```

### 5. Current Clamp c1 - All 4 Clamps (Last Hour Average)

```javascript
// Clamp 1
{
    query: 'avg_over_time(iot_sensor_reading{sensor_id="cs01-a840412f375a8bd6", sensor_type="current_clamp_1"}[1h])',
    time: new Date().toISOString()
}

// Clamp 2
{
    query: 'avg_over_time(iot_sensor_reading{sensor_id="cs01-a840412f375a8bd6", sensor_type="current_clamp_2"}[1h])',
    time: new Date().toISOString()
}

// Clamp 3
{
    query: 'avg_over_time(iot_sensor_reading{sensor_id="cs01-a840412f375a8bd6", sensor_type="current_clamp_3"}[1h])',
    time: new Date().toISOString()
}

// Clamp 4
{
    query: 'avg_over_time(iot_sensor_reading{sensor_id="cs01-a840412f375a8bd6", sensor_type="current_clamp_4"}[1h])',
    time: new Date().toISOString()
}
// Results: 0.36A, 0.45A, 0.35A, 0.20A
```

### 6. Current Humidity for All Sensors

```javascript
{
    query: 'iot_sensor_reading{sensor_type="humidity"}',
    time: new Date().toISOString()
}
// Returns current humidity for all sensors
```

### 7. Min/Max/Avg Temperature for t1 (Last 30 Days)

```javascript
// Minimum
{
    query: 'min_over_time(iot_sensor_reading{sensor_id="lite-a81758fffe0d2d67", sensor_type="temperature"}[30d])',
    time: new Date().toISOString()
}
// Result: 15.9°C

// Maximum
{
    query: 'max_over_time(iot_sensor_reading{sensor_id="lite-a81758fffe0d2d67", sensor_type="temperature"}[30d])',
    time: new Date().toISOString()
}
// Result: 29.3°C

// Average
{
    query: 'avg_over_time(iot_sensor_reading{sensor_id="lite-a81758fffe0d2d67", sensor_type="temperature"}[30d])',
    time: new Date().toISOString()
}
// Result: 22.78°C
```

### 8. Compare Average Temperature t1 vs t2 (Last 7 Days)

```javascript
// t1
{
    query: 'avg_over_time(iot_sensor_reading{sensor_id="lite-a81758fffe0d2d67", sensor_type="temperature"}[7d])',
    time: new Date().toISOString()
}
// Result: 22.13°C

// t2
{
    query: 'avg_over_time(iot_sensor_reading{sensor_id="lite-a81758fffe0d2d6b", sensor_type="temperature"}[7d])',
    time: new Date().toISOString()
}
// Result: 19.41°C
```

---

## Query Templates

### Get Average for Specific Sensor Over Time Period

**Using sensor_name (Recommended):**
```javascript
const query = `avg_over_time(iot_sensor_reading{sensor_name="${sensorName}", sensor_type="${type}"}[${period}])`;

// Example:
// sensorName: "t1", "s2", "c1"
// type: "temperature", "soundAvg", "current_clamp_1"
// period: "20d", "7d", "24h", "1h"
```

**Using sensor_id (Alternative):**
```javascript
const query = `avg_over_time(iot_sensor_reading{sensor_id="${sensorId}", sensor_type="${type}"}[${period}])`;

// Example:
// sensorId: "lite-a81758fffe0d4ab0"
// type: "temperature"
// period: "20d", "7d", "24h", "1h"
```

### Get Time Series Data

**Using sensor_name:**
```javascript
const rangeQuery = {
    query: `iot_sensor_reading{sensor_name="${sensorName}", sensor_type="${type}"}`,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    step: '1h' // or '15m', '1d', etc.
};

// Use endpoint: /query_range
```

**Using sensor_id:**
```javascript
const rangeQuery = {
    query: `iot_sensor_reading{sensor_id="${sensorId}", sensor_type="${type}"}`,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    step: '1h'
};
```

### Get Current Value (Instant Query)

**Using sensor_name:**
```javascript
const instantQuery = {
    query: `iot_sensor_reading{sensor_name="${sensorName}", sensor_type="${type}"}`,
    time: new Date().toISOString()
};

// Use endpoint: /query
```

**Using sensor_id:**
```javascript
const instantQuery = {
    query: `iot_sensor_reading{sensor_id="${sensorId}", sensor_type="${type}"}`,
    time: new Date().toISOString()
};
```

### Aggregate Across Multiple Sensors

```javascript
// Average across all sensors of a type
const avgQuery = `avg(iot_sensor_reading{sensor_type="${type}"})`;

// Sum across all sensors
const sumQuery = `sum(iot_sensor_reading{sensor_type="${type}"})`;

// Min/Max across all sensors
const minQuery = `min(iot_sensor_reading{sensor_type="${type}"})`;
const maxQuery = `max(iot_sensor_reading{sensor_type="${type}"})`;
```

### Group By Sensor

```javascript
// Average by sensor (returns multiple results)
const groupedQuery = `avg(iot_sensor_reading{sensor_type="${type}"}) by (sensor_id)`;
```

---

## Sensor Types Reference

### Temperature Sensors (t1-t15)

- **Sensor Type:** `temperature`
- **Units:** °C (Celsius)
- **MetricsQL Functions:**
  - `avg_over_time()` - Average over time period
  - `min_over_time()` - Minimum value
  - `max_over_time()` - Maximum value
  - `rate()` - Rate of change

### Sound Sensors (s1-s2)

- **Sensor Types:**
  - `soundAvg` - Average sound level
  - `soundPeak` - Peak sound level
- **Units:** dB (Decibels)
- **Available on:** sound-a81758fffe0d0434, sound-a81758fffe0d0437

### Current Clamp Sensors (c1-c2)

- **Sensor Types:**
  - `current_clamp_1` - Clamp 1
  - `current_clamp_2` - Clamp 2
  - `current_clamp_3` - Clamp 3
  - `current_clamp_4` - Clamp 4
- **Units:** A (Amperes)
- **Available on:** cs01-a840412f375a8bd6, cs01-a84041e9eb5c3996

### Other Available Sensor Types

| Sensor Type | Units | Description |
|-------------|-------|-------------|
| `humidity` | % | Relative humidity |
| `light` | lux | Light intensity |
| `motion` | boolean | Motion detection |
| `vdd` | V | Supply voltage |
| `Bat_V` | V | Battery voltage |

---

## Sample Query Results

Real data examples from the VictoriaMetrics database:

### Temperature Readings

| Query | Result |
|-------|--------|
| t1 average (20 days) | 22.16°C |
| t1 min (30 days) | 15.9°C |
| t1 max (30 days) | 29.3°C |
| t1 current | 25.4°C |
| t2 average (7 days) | 19.41°C |
| Overall average (24h) | 20.20°C |

### Sound Readings

| Query | Result |
|-------|--------|
| s1 average (24h) | 48.83 dB |

### Current Readings (c1)

| Clamp | Average (1h) |
|-------|--------------|
| Clamp 1 | 0.36 A |
| Clamp 2 | 0.45 A |
| Clamp 3 | 0.35 A |
| Clamp 4 | 0.20 A |

### Humidity Readings

| Sensor | Current |
|--------|---------|
| t1 | 34% |
| t3 | 40% |

---

## Time Range Syntax

VictoriaMetrics supports the following time range formats:

| Format | Description | Example |
|--------|-------------|---------|
| `[Ns]` | Seconds | `[30s]` = 30 seconds |
| `[Nm]` | Minutes | `[15m]` = 15 minutes |
| `[Nh]` | Hours | `[24h]` = 24 hours |
| `[Nd]` | Days | `[7d]` = 7 days |
| `[Nw]` | Weeks | `[2w]` = 2 weeks |

### Step Values (query_range)

For time series queries, use these step values:

| Step | Use Case |
|------|----------|
| `15m` | High resolution, short periods (last 24 hours) |
| `1h` | Medium resolution (last 7 days) |
| `6h` | Lower resolution (last 30 days) |
| `1d` | Daily aggregation (last 90+ days) |

---

## Authentication

All requests require Basic authentication:

```javascript
headers: {
    'authorization': 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
}
```

This token is stored in the `.env` file as `VICTORIA_METRICS_EXTERNAL_TOKEN`.

---

## MetricsQL Functions Reference

Common MetricsQL functions for queries:

### Aggregation Over Time

- `avg_over_time(metric[period])` - Average value over time period
- `min_over_time(metric[period])` - Minimum value
- `max_over_time(metric[period])` - Maximum value
- `sum_over_time(metric[period])` - Sum of all values
- `count_over_time(metric[period])` - Count of data points

### Aggregation Across Series

- `avg(metric)` - Average across all matching series
- `min(metric)` - Minimum across all matching series
- `max(metric)` - Maximum across all matching series
- `sum(metric)` - Sum across all matching series
- `count(metric)` - Count of matching series

### Rate and Derivative

- `rate(metric[period])` - Per-second average rate of increase
- `deriv(metric[period])` - Derivative (rate of change)

### Grouping

- `by (label1, label2)` - Group results by labels
- `without (label1, label2)` - Group by all labels except specified

---

## Best Practices

1. **Use appropriate time ranges:**
   - Instant queries (`/query`): Single value at specific time
   - Range queries (`/query_range`): Time series data

2. **Choose optimal step values:**
   - Smaller steps = more data points = slower queries
   - Balance between resolution and performance

3. **Filter early:**
   - Use specific sensor_id and sensor_type filters
   - Reduces data processing overhead

4. **Cache results:**
   - VictoriaMetrics has built-in caching
   - Identical queries return faster

5. **Use aggregation functions:**
   - Pre-aggregate with MetricsQL instead of post-processing
   - Better performance and accuracy

---

## Related Files

- `sensor-mapping.json` - Machine-readable sensor mapping
- `complete-sensor-mapping.js` - Script to regenerate mapping
- `report-query-examples.js` - JavaScript examples with live queries
- `VICTORIAMETRICS_CONFIG.md` - VictoriaMetrics configuration guide

---

## Support

For questions or issues:
- Check VictoriaMetrics documentation: https://docs.victoriametrics.com/MetricsQL.html
- Review existing query examples in this document
- Contact system administrator for sensor additions or changes

---

**Last Updated:** 2025-11-14
**VictoriaMetrics API Version:** v1
