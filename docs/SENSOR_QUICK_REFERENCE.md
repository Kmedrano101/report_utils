# Sensor Quick Reference Card

Quick lookup for sensor names and common queries.

## Sensor IDs

### Temperature (t1-t15)
```
t1  → lite-a81758fffe0d2d67    t6  → lite-a81758fffe0d4ab1    t11 → lite-a81758fffe0d4af9
t2  → lite-a81758fffe0d2d6b    t7  → lite-a81758fffe0d4ab3    t12 → lite-a81758fffe0d4afa
t3  → lite-a81758fffe0d2d6c    t8  → lite-a81758fffe0d4ab4    t13 → lite-a81758fffe0d4afb
t4  → lite-a81758fffe0d4aae    t9  → lite-a81758fffe0d4ab5    t14 → sound-a81758fffe0d0434
t5  → lite-a81758fffe0d4aaf    t10 → lite-a81758fffe0d4af4    t15 → sound-a81758fffe0d0437
```

### Sound (s1-s2)
```
s1 → sound-a81758fffe0d0434
s2 → sound-a81758fffe0d0437
```

### Clamps (c1-c2)
```
c1 → cs01-a840412f375a8bd6
c2 → cs01-a84041e9eb5c3996
```

## Common Queries

### Temperature

```javascript
// Average over period
avg_over_time(iot_sensor_reading{sensor_id="SENSOR_ID", sensor_type="temperature"}[20d])

// Min/Max over period
min_over_time(iot_sensor_reading{sensor_id="SENSOR_ID", sensor_type="temperature"}[30d])
max_over_time(iot_sensor_reading{sensor_id="SENSOR_ID", sensor_type="temperature"}[30d])

// Current value
iot_sensor_reading{sensor_id="SENSOR_ID", sensor_type="temperature"}
```

### Sound

```javascript
// Average sound
avg_over_time(iot_sensor_reading{sensor_id="SENSOR_ID", sensor_type="soundAvg"}[24h])

// Peak sound
max_over_time(iot_sensor_reading{sensor_id="SENSOR_ID", sensor_type="soundPeak"}[24h])
```

### Current Clamps

```javascript
// Single clamp average
avg_over_time(iot_sensor_reading{sensor_id="SENSOR_ID", sensor_type="current_clamp_1"}[1h])

// All 4 clamps (replace clamp number 1-4)
iot_sensor_reading{sensor_id="SENSOR_ID", sensor_type=~"current_clamp_.*"}
```

### Other Sensors

```javascript
// Humidity
iot_sensor_reading{sensor_id="SENSOR_ID", sensor_type="humidity"}

// Light
iot_sensor_reading{sensor_id="SENSOR_ID", sensor_type="light"}

// Motion
iot_sensor_reading{sensor_id="SENSOR_ID", sensor_type="motion"}
```

## Time Periods

| Format | Description |
|--------|-------------|
| `[30s]` | 30 seconds |
| `[15m]` | 15 minutes |
| `[1h]` | 1 hour |
| `[24h]` | 24 hours |
| `[7d]` | 7 days |
| `[30d]` | 30 days |

## API Endpoints

- **Instant Query:** `/query` - Single value at specific time
- **Range Query:** `/query_range` - Time series data

## Full Request Example

```javascript
const url = 'https://api.iot.tidop.es/v1/vm/query';
const response = await fetch(url, {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        'authorization': 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    },
    body: JSON.stringify({
        query: 'avg_over_time(iot_sensor_reading{sensor_id="lite-a81758fffe0d2d67", sensor_type="temperature"}[20d])',
        time: new Date().toISOString()
    })
});
const data = await response.json();
const value = data.result[0].values[0];
```

---

**See full documentation:** [SENSOR_MAPPING_AND_QUERIES.md](./SENSOR_MAPPING_AND_QUERIES.md)
