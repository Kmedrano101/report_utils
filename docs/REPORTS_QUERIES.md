# Reports & Key Metrics Queries

Comprehensive guide for generating useful reports and monitoring key metrics from IoT sensors.

## Table of Contents

- [Overview](#overview)
- [Sensor Inventory](#sensor-inventory)
- [Key Metrics Queries](#key-metrics-queries)
- [Query Examples](#query-examples)
- [Best Practices](#best-practices)

---

## Overview

This document provides 10 essential query patterns for monitoring and analyzing IoT sensor data. Each query is designed to extract meaningful insights from your sensor network.

**API Endpoint:** `https://api.iot.tidop.es/v1/vm`

**Available Sensors:**
- 15 Temperature Sensors (t1-t30)
- 5 Sound Sensors (s1-s7)
- 2 Current Clamp Sensors (c1-c2)
- **Total:** 22 sensors

---

## Sensor Inventory

### Temperature Sensors (15 sensors)
**Capabilities:** temperature (°C), humidity (%), vdd (mV)

### Sound Sensors (5 sensors)
**Capabilities:** soundAvg (dB), soundPeak (dB), temperature (°C), humidity (%), light (lux), motion (boolean), vdd (mV)

### Current Clamp Sensors (2 sensors)
**Capabilities:** current_clamp_1-4 (A), Bat_V (V)

---

## Key Metrics Queries

### 1. Overall Temperature Overview

**Description:** Get average temperature across all temperature sensors for environmental monitoring.

**Use Case:** Facility-wide temperature monitoring, HVAC optimization, climate control validation.

**Query:**
```javascript
{
    query: 'avg(iot_sensor_reading{sensor_type="temperature"})',
    time: new Date().toISOString()
}
```

**Expected Result:** Single average value representing overall facility temperature.

**Example Response:**
```json
{
  "status": "OK",
  "result": [{
    "metric": {},
    "values": [18.5]  // Average temperature: 18.5°C
  }]
}
```

---

### 2. Temperature Range Analysis (Min/Max)

**Description:** Identify minimum and maximum temperatures across all sensors to detect hotspots or cold zones.

**Use Case:** Temperature variance analysis, equipment performance validation, energy efficiency studies.

**Queries:**
```javascript
// Minimum temperature
{
    query: 'min(iot_sensor_reading{sensor_type="temperature"})'
}

// Maximum temperature
{
    query: 'max(iot_sensor_reading{sensor_type="temperature"})'
}

// Temperature range per sensor (last 24h)
{
    query: 'max_over_time(iot_sensor_reading{sensor_type="temperature"}[24h]) - min_over_time(iot_sensor_reading{sensor_type="temperature"}[24h]) by (sensor_name)'
}
```

**Expected Result:**
- Min: 15.0°C (sensor t1)
- Max: 22.5°C (sensor t20)
- Range: 7.5°C variance

---

### 3. Sound Level Monitoring

**Description:** Monitor average and peak sound levels across all sound sensors for noise pollution analysis.

**Use Case:** Noise compliance monitoring, occupancy detection, acoustic environment assessment.

**Queries:**
```javascript
// Average sound level (all sensors)
{
    query: 'avg(iot_sensor_reading{sensor_type="soundAvg"})'
}

// Peak sound events (last 1 hour)
{
    query: 'max_over_time(iot_sensor_reading{sensor_type="soundPeak"}[1h]) by (sensor_name)'
}

// Sound sensors above threshold (>50dB)
{
    query: 'iot_sensor_reading{sensor_type="soundAvg"} > 50'
}
```

**Expected Result:**
- Average: 48 dB
- Peak events by sensor
- Sensors exceeding noise threshold

---

### 4. Power Consumption Analysis

**Description:** Monitor electrical current across all clamp sensors for power usage analysis.

**Use Case:** Energy consumption monitoring, load balancing, electrical safety, cost optimization.

**Queries:**
```javascript
// Total current consumption (all clamps, all channels)
{
    query: 'sum(iot_sensor_reading{sensor_type=~"current_clamp_.*"})'
}

// Average consumption per channel (last 24h)
{
    query: 'avg_over_time(iot_sensor_reading{sensor_type="current_clamp_1"}[24h]) by (sensor_name)'
}

// Peak load detection (last 7 days)
{
    query: 'max_over_time(iot_sensor_reading{sensor_type=~"current_clamp_.*"}[7d]) by (sensor_name, sensor_type)'
}
```

**Expected Result:**
- Total consumption: ~1.35 A across all channels
- Per-channel breakdown
- Peak load times and values

---

### 5. Environmental Conditions Dashboard

**Description:** Get complete environmental snapshot including temperature, humidity, and light levels.

**Use Case:** Indoor air quality monitoring, comfort assessment, environmental compliance.

**Queries:**
```javascript
// Average humidity across facility
{
    query: 'avg(iot_sensor_reading{sensor_type="humidity"})'
}

// Light levels by location
{
    query: 'iot_sensor_reading{sensor_type="light"} by (sensor_name)'
}

// Temperature + Humidity correlation (comfort index)
{
    query: 'avg(iot_sensor_reading{sensor_type="temperature"}) + avg(iot_sensor_reading{sensor_type="humidity"}) / 10'
}
```

**Expected Result:**
- Average humidity: 45%
- Light levels: 34-120 lux
- Comfort index calculation

---

### 6. Motion Detection & Occupancy

**Description:** Monitor motion events across sound sensors to detect occupancy and activity patterns.

**Use Case:** Occupancy tracking, security monitoring, space utilization analysis, energy savings.

**Queries:**
```javascript
// Active motion sensors (current)
{
    query: 'iot_sensor_reading{sensor_type="motion"} == 1'
}

// Motion events count (last 24h)
{
    query: 'count_over_time(iot_sensor_reading{sensor_type="motion"}[24h]) by (sensor_name)'
}

// Occupancy pattern (hourly motion detection rate)
{
    query: 'rate(iot_sensor_reading{sensor_type="motion"}[1h])'
}
```

**Expected Result:**
- Currently active sensors
- Total motion events per sensor
- Occupancy patterns by hour

---

### 7. Battery Health Monitoring

**Description:** Monitor battery voltage across all sensors to predict maintenance needs.

**Use Case:** Preventive maintenance, sensor uptime assurance, battery replacement planning.

**Queries:**
```javascript
// All sensor battery levels
{
    query: 'iot_sensor_reading{sensor_type=~"vdd|Bat_V"} by (sensor_name, sensor_type)'
}

// Low battery sensors (<3500mV or <3.2V)
{
    query: 'iot_sensor_reading{sensor_type="vdd"} < 3500 or iot_sensor_reading{sensor_type="Bat_V"} < 3.2'
}

// Battery drain rate (last 7 days)
{
    query: 'deriv(iot_sensor_reading{sensor_type=~"vdd|Bat_V"}[7d])'
}
```

**Expected Result:**
- All battery levels by sensor
- Sensors requiring attention
- Battery consumption trends

---

### 8. Hourly Temperature Trends (24h)

**Description:** Track temperature changes over the last 24 hours for all sensors.

**Use Case:** Daily pattern analysis, HVAC performance validation, historical trending.

**Endpoint:** `/query_range`

**Query:**
```javascript
{
    query: 'avg(iot_sensor_reading{sensor_type="temperature"}) by (sensor_name)',
    start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
    step: '1h'
}
```

**Expected Result:** Time series data with hourly temperature values for each sensor over 24 hours.

**Visualization:** Line chart showing temperature trends per sensor.

---

### 9. Peak Sound Events Detection

**Description:** Identify and analyze peak sound events that exceed normal levels.

**Use Case:** Noise complaint investigation, acoustic anomaly detection, security events.

**Queries:**
```javascript
// Peak events above 70dB (last 24h)
{
    query: 'iot_sensor_reading{sensor_type="soundPeak"} > 70'
}

// Time series of peak events (last 7 days, hourly)
{
    query: 'max_over_time(iot_sensor_reading{sensor_type="soundPeak"}[1h])',
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
    step: '1h'
}

// Average vs Peak comparison
{
    query: 'iot_sensor_reading{sensor_type="soundPeak"} - iot_sensor_reading{sensor_type="soundAvg"}'
}
```

**Expected Result:**
- Sensors with recent peak events
- Historical peak event timeline
- Sound level variance analysis

---

### 10. Multi-Metric Sensor Health Report

**Description:** Comprehensive health check across all sensor types and metrics.

**Use Case:** Daily system status report, anomaly detection, maintenance scheduling.

**Queries:**
```javascript
// Count of active sensors by type
{
    query: 'count(iot_sensor_reading) by (sensor_name)'
}

// Sensors with stale data (no update in 30m)
{
    query: 'time() - timestamp(iot_sensor_reading) > 1800'
}

// Summary statistics by sensor category
{
    query: 'avg(iot_sensor_reading{sensor_type="temperature"}) by (sensor_name)',
    query2: 'avg(iot_sensor_reading{sensor_type="soundAvg"}) by (sensor_name)',
    query3: 'avg(iot_sensor_reading{sensor_type="current_clamp_1"}) by (sensor_name)'
}
```

**Expected Result:**
- Total active sensors: 22
- Offline/stale sensors: 0
- Health summary by category

---

## Query Examples

### Complete Query Structure

**For instant queries (current/latest values):**
```javascript
const url = 'https://api.iot.tidop.es/v1/vm/query';
const options = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        'authorization': 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    },
    body: JSON.stringify({
        query: 'avg(iot_sensor_reading{sensor_type="temperature"})'
    })
};

const response = await fetch(url, options);
const data = await response.json();
console.log('Average Temperature:', data.result[0].values[0], '°C');
```

**For range queries (time series data):**
```javascript
const url = 'https://api.iot.tidop.es/v1/vm/query_range';
const options = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        'authorization': 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    },
    body: JSON.stringify({
        query: 'iot_sensor_reading{sensor_type="temperature"}',
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
        step: '1h'
    })
};

const response = await fetch(url, options);
const data = await response.json();
// Returns hourly temperature data for last 24 hours
```

---

## Best Practices

### 1. Query Optimization

- **Use specific labels:** Filter by `sensor_name` or `sensor_type` to reduce data processing
- **Choose appropriate time ranges:** Balance between data granularity and query performance
- **Use aggregation functions:** Pre-aggregate data in queries rather than post-processing

### 2. Time Series Queries

| Time Range | Recommended Step | Use Case |
|------------|------------------|----------|
| Last 6 hours | 5m - 15m | Real-time monitoring |
| Last 24 hours | 15m - 1h | Daily analysis |
| Last 7 days | 1h - 6h | Weekly trends |
| Last 30 days | 6h - 1d | Monthly reports |
| Last 90 days | 1d | Quarterly analysis |

### 3. Useful Aggregation Functions

- `avg()` - Average across sensors
- `min()` / `max()` - Find extremes
- `sum()` - Total values (useful for current consumption)
- `count()` - Number of sensors/events
- `rate()` - Change rate over time
- `deriv()` - Derivative (trend direction)

### 4. Common Filters

```javascript
// By sensor name
{sensor_name="t1"}

// By sensor type
{sensor_type="temperature"}

// Multiple sensor types (regex)
{sensor_type=~"current_clamp_.*"}

// Value threshold
iot_sensor_reading{sensor_type="temperature"} > 25

// Combine filters
{sensor_name=~"s.*", sensor_type="soundAvg"}
```

### 5. Report Generation Tips

1. **Schedule regular queries** for automated reporting
2. **Cache results** for frequently accessed metrics
3. **Use dashboards** for real-time visualization
4. **Set up alerts** for threshold violations
5. **Export to CSV/PDF** for stakeholder reports

---

## Report Templates

### Daily Summary Report

```javascript
// Execute these queries for a daily summary:
const dailyReport = {
    avgTemperature: 'avg(iot_sensor_reading{sensor_type="temperature"})',
    avgHumidity: 'avg(iot_sensor_reading{sensor_type="humidity"})',
    avgSound: 'avg(iot_sensor_reading{sensor_type="soundAvg"})',
    totalPower: 'sum(iot_sensor_reading{sensor_type=~"current_clamp_.*"})',
    motionEvents: 'count_over_time(iot_sensor_reading{sensor_type="motion"}[24h])',
    lowBattery: 'count(iot_sensor_reading{sensor_type="vdd"} < 3500)'
};
```

### Weekly Trend Report

```javascript
// 7-day analysis with daily aggregation
{
    query: 'avg_over_time(iot_sensor_reading{sensor_type="temperature"}[24h])',
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
    step: '1d'
}
```

### Monthly Energy Report

```javascript
// 30-day power consumption analysis
{
    query: 'sum_over_time(iot_sensor_reading{sensor_type=~"current_clamp_.*"}[24h])',
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
    step: '1d'
}
```

---

## Related Documentation

- [Sensor Mapping & Queries](SENSOR_MAPPING_AND_QUERIES.md) - Complete sensor reference
- [VictoriaMetrics Migration](VICTORIAMETRICS_MIGRATION.md) - Database setup
- [External Database Integration](EXTERNAL_DB_INTEGRATION.md) - Connection guide

---

## Support

For additional query patterns or custom metrics:
- Review [MetricsQL Documentation](https://docs.victoriametrics.com/MetricsQL.html)
- Check [sensor-mapping.json](sensor-mapping.json) for sensor IDs
- Contact system administrator for new sensor additions

---

**Last Updated:** 2025-11-14
**VictoriaMetrics API Version:** v1
**Total Sensors:** 22 (15 temperature, 5 sound, 2 current clamp)
