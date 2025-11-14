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

⚠️ **The external VictoriaMetrics does NOT have a `sensor_name` label.**

It only uses `sensor_id` for identification. The friendly names (s1-s8, t1-t30, c1-c2) are mapped to actual sensor IDs as shown below.

---

## Sensor Inventory

### Summary

- **Temperature Sensors:** 15 (t1-t15)
- **Sound Sensors:** 2 (s1-s2)
- **Current Clamp Sensors:** 2 (c1-c2)
- **Total Physical Sensors:** 17

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

### Temperature Sensors (t1-t15)

| Friendly Name | Sensor ID | Model | Sensor Types |
|---------------|-----------|-------|--------------|
| t1 | lite-a81758fffe0d2d67 | elsys ers-lite | temperature, humidity, vdd |
| t2 | lite-a81758fffe0d2d6b | elsys ers-lite | temperature, humidity, vdd |
| t3 | lite-a81758fffe0d2d6c | elsys ers-lite | temperature, humidity, vdd |
| t4 | lite-a81758fffe0d4aae | elsys ers-lite | temperature, humidity, vdd |
| t5 | lite-a81758fffe0d4aaf | elsys ers-lite | temperature, humidity, vdd |
| t6 | lite-a81758fffe0d4ab1 | elsys ers-lite | temperature, humidity, vdd |
| t7 | lite-a81758fffe0d4ab3 | elsys ers-lite | temperature, humidity, vdd |
| t8 | lite-a81758fffe0d4ab4 | elsys ers-lite | temperature, humidity, vdd |
| t9 | lite-a81758fffe0d4ab5 | elsys ers-lite | temperature, humidity, vdd |
| t10 | lite-a81758fffe0d4af4 | elsys ers-lite | temperature, humidity, vdd |
| t11 | lite-a81758fffe0d4af9 | elsys ers-lite | temperature, humidity, vdd |
| t12 | lite-a81758fffe0d4afa | elsys ers-lite | temperature, humidity, vdd |
| t13 | lite-a81758fffe0d4afb | elsys ers-lite | temperature, humidity, vdd |
| t14 | sound-a81758fffe0d0434 | elsys ers-sound | temperature, humidity, sound, light, motion, vdd |
| t15 | sound-a81758fffe0d0437 | elsys ers-sound | temperature, humidity, sound, light, motion, vdd |

### Sound Sensors (s1-s2)

| Friendly Name | Sensor ID | Model | Sensor Types |
|---------------|-----------|-------|--------------|
| s1 | sound-a81758fffe0d0434 | elsys ers-sound | soundAvg, soundPeak, temperature, humidity, light, motion, vdd |
| s2 | sound-a81758fffe0d0437 | elsys ers-sound | soundAvg, soundPeak, temperature, humidity, light, motion, vdd |

### Current Clamp Sensors (c1-c2)

| Friendly Name | Sensor ID | Model | Sensor Types |
|---------------|-----------|-------|--------------|
| c1 | cs01-a840412f375a8bd6 | unknown | current_clamp_1, current_clamp_2, current_clamp_3, current_clamp_4, Bat_V |
| c2 | cs01-a84041e9eb5c3996 | unknown | current_clamp_1, current_clamp_2, current_clamp_3, current_clamp_4, Bat_V |

### JSON Mapping

```json
{
  "temperature": {
    "t1": "lite-a81758fffe0d2d67",
    "t2": "lite-a81758fffe0d2d6b",
    "t3": "lite-a81758fffe0d2d6c",
    "t4": "lite-a81758fffe0d4aae",
    "t5": "lite-a81758fffe0d4aaf",
    "t6": "lite-a81758fffe0d4ab1",
    "t7": "lite-a81758fffe0d4ab3",
    "t8": "lite-a81758fffe0d4ab4",
    "t9": "lite-a81758fffe0d4ab5",
    "t10": "lite-a81758fffe0d4af4",
    "t11": "lite-a81758fffe0d4af9",
    "t12": "lite-a81758fffe0d4afa",
    "t13": "lite-a81758fffe0d4afb",
    "t14": "sound-a81758fffe0d0434",
    "t15": "sound-a81758fffe0d0437"
  },
  "sound": {
    "s1": "sound-a81758fffe0d0434",
    "s2": "sound-a81758fffe0d0437"
  },
  "clamp": {
    "c1": "cs01-a840412f375a8bd6",
    "c2": "cs01-a84041e9eb5c3996"
  }
}
```

---

## Query Examples

### 1. Average Temperature for t1 (Last 20 Days)

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
        query: 'avg_over_time(iot_sensor_reading{sensor_id="lite-a81758fffe0d2d67", sensor_type="temperature"}[20d])',
        time: new Date().toISOString()
    })
};

const response = await fetch(url, options);
const data = await response.json();
// Result: data.result[0].values[0] = 22.16°C
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
        query: 'iot_sensor_reading{sensor_id="lite-a81758fffe0d2d67", sensor_type="temperature"}',
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
        step: '1h'
    })
};

const response = await fetch(url, options);
const data = await response.json();
// Result: data.result[0].values = [24.7, 24.8, 25.1, ..., 25.4]
```

### 3. Overall Average Temperature (All Sensors, Last 24 Hours)

```javascript
{
    query: 'avg(avg_over_time(iot_sensor_reading{sensor_type="temperature"}[24h]))',
    time: new Date().toISOString()
}
// Result: 20.20°C
```

### 4. Sound Level for s1 (Last 24 Hours Average)

```javascript
{
    query: 'avg_over_time(iot_sensor_reading{sensor_id="sound-a81758fffe0d0434", sensor_type="soundAvg"}[24h])',
    time: new Date().toISOString()
}
// Result: 48.83 dB
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

```javascript
const query = `avg_over_time(iot_sensor_reading{sensor_id="${sensorId}", sensor_type="${type}"}[${period}])`;

// Example:
// sensor_id: "lite-a81758fffe0d2d67"
// type: "temperature"
// period: "20d", "7d", "24h", "1h"
```

### Get Time Series Data

```javascript
const rangeQuery = {
    query: `iot_sensor_reading{sensor_id="${sensorId}", sensor_type="${type}"}`,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    step: '1h' // or '15m', '1d', etc.
};

// Use endpoint: /query_range
```

### Get Current Value (Instant Query)

```javascript
const instantQuery = {
    query: `iot_sensor_reading{sensor_id="${sensorId}", sensor_type="${type}"}`,
    time: new Date().toISOString()
};

// Use endpoint: /query
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
