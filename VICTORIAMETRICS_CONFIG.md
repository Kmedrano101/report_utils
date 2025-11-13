# VictoriaMetrics Database Configuration

## Connection Information

### HTTP API Endpoint
```
http://localhost:8428
```

### Available Ports
- **8428** - HTTP API (Primary endpoint for queries)
- **8089** - InfluxDB line protocol
- **2003** - Graphite plaintext protocol
- **4242** - OpenTSDB protocol

## Database Statistics

| Metric | Value |
|--------|-------|
| **Total Metrics** | 1,715,481 |
| **Unique Metric Names** | 8 |
| **Total Sensors** | 11 sensors |
| **Date Range** | October 1 - November 11, 2025 (41 days) |
| **Retention Period** | 12 months |
| **Storage Format** | Time-series optimized |
| **Query Language** | MetricsQL (Prometheus-compatible) |

## Available Metrics

### Current Readings (Electrical Sensors)
```
battery_voltage_mv          - Battery voltage in millivolts
clamp_current_amperes       - Clamp current readings (labels: clamp="1-4")
```

### Environmental Readings
```
temperature_celsius         - Temperature in Celsius
humidity_percent           - Humidity percentage
light_lux                  - Light level in lux
movement                   - Movement detection (boolean)
noise_avg_db              - Average noise in decibels
noise_peak_db             - Peak noise in decibels
```

## Common Metric Labels

All metrics include these labels for filtering:
- `sensor_code` - Sensor identifier (e.g., "c1", "s4", "t3")
- `sensor_name` - Human-readable sensor name
- `sensor_type` - Type of sensor (current, environmental, temperature)
- `location` - Physical location (e.g., "Electrical Panel", "Server Room")
- `building` - Building name (e.g., "Madison Building")
- `floor` - Floor level or "unknown"

## Query Examples

### 1. Get Battery Voltage for All Sensors
```bash
curl 'http://localhost:8428/api/v1/query?query=battery_voltage_mv&time=2025-11-11T12:00:00Z'
```

### 2. Get All Clamp Currents (4 clamps)
```bash
curl 'http://localhost:8428/api/v1/query?query=clamp_current_amperes&time=2025-11-11T12:00:00Z'
```

### 3. Get Temperature for Specific Sensor
```bash
curl 'http://localhost:8428/api/v1/query?query=temperature_celsius{sensor_code="t3"}&time=2025-11-11T12:00:00Z'
```

### 4. Query Time Range (Oct 1 - Nov 11)
```bash
curl 'http://localhost:8428/api/v1/query_range?query=temperature_celsius&start=2025-10-01T00:00:00Z&end=2025-11-11T23:59:59Z&step=1h'
```

### 5. Average Temperature by Location (MetricsQL)
```bash
curl 'http://localhost:8428/api/v1/query?query=avg(temperature_celsius)by(location)&time=2025-11-11T12:00:00Z'
```

### 6. Total Power Consumption (All Clamps)
```bash
curl 'http://localhost:8428/api/v1/query?query=sum(clamp_current_amperes)&time=2025-11-11T12:00:00Z'
```

### 7. Max Temperature by Sensor
```bash
curl 'http://localhost:8428/api/v1/query?query=max(temperature_celsius)by(sensor_code)&time=2025-11-11T12:00:00Z'
```

## Web Interfaces

### VictoriaMetrics Built-in UI
```
http://localhost:8428/vmui
```
Interactive web interface for:
- Query execution
- Metrics exploration
- Visualization
- Performance monitoring

### IoT Report Utils Dashboard
```
http://localhost:3000
```
Navigate to **Database Config** tab to:
- View connection status
- Test VictoriaMetrics connection
- See real-time metrics count
- Access quick links to documentation

## Test Connection

### Health Check
```bash
curl http://localhost:8428/health
```
Expected response: `OK`

### List All Metrics
```bash
curl http://localhost:8428/api/v1/label/__name__/values | jq
```

### Test Query with Historical Data
```bash
curl 'http://localhost:8428/api/v1/query?query=battery_voltage_mv&time=2025-11-11T12:00:00Z' | jq
```

## Important Notes

### Historical Data Querying
⚠️ **Important**: The database contains historical data (Oct 1 - Nov 11, 2025). When querying:
- **Always specify a time parameter** using `time=` or `start=`/`end=`
- Default queries without time return only recent data
- Use ISO 8601 format: `2025-11-11T12:00:00Z`

### Time Ranges
```bash
# Single point in time
time=2025-11-11T12:00:00Z

# Time range
start=2025-10-01T00:00:00Z&end=2025-11-11T23:59:59Z&step=1h
```

### Label Filtering
```bash
# Filter by sensor code
query=temperature_celsius{sensor_code="t3"}

# Filter by location
query=humidity_percent{location="Server Room"}

# Multiple labels
query=battery_voltage_mv{sensor_type="current",building="Madison Building"}
```

## MetricsQL Functions

VictoriaMetrics supports MetricsQL, an enhanced version of PromQL:

### Aggregation
- `sum()` - Total sum
- `avg()` - Average
- `max()` - Maximum
- `min()` - Minimum
- `count()` - Count values

### Rate Calculations
- `rate()` - Per-second rate
- `increase()` - Total increase
- `delta()` - Difference

### Time Series
- `avg_over_time()` - Average over time window
- `max_over_time()` - Max over time window
- `min_over_time()` - Min over time window

## Configuration Files

### Docker Compose
```yaml
# /home/kmedrano/src/report_utils/docker-compose.yml
victoriametrics:
  image: victoriametrics/victoria-metrics:latest
  ports:
    - "8428:8428"  # HTTP API
    - "8089:8089"  # InfluxDB
    - "2003:2003"  # Graphite
    - "4242:4242"  # OpenTSDB
  volumes:
    - victoria_data:/victoria-metrics-data
  command:
    - '--storageDataPath=/victoria-metrics-data'
    - '--httpListenAddr=:8428'
    - '--retentionPeriod=12'  # 12 months
    - '--maxLabelsPerTimeseries=50'
    - '--search.maxQueryDuration=300s'
```

## Resources

- [VictoriaMetrics Documentation](https://docs.victoriametrics.com/)
- [MetricsQL Reference](https://docs.victoriametrics.com/MetricsQL.html)
- [Querying API](https://docs.victoriametrics.com/Single-server-VictoriaMetrics.html#prometheus-querying-api-usage)
- [Migration Documentation](./docs/VICTORIAMETRICS_MIGRATION.md)

## Troubleshooting

### Connection Refused
```bash
# Check if container is running
docker ps | grep victoriametrics

# Check logs
docker logs iot-victoriametrics

# Restart container
docker restart iot-victoriametrics
```

### Empty Query Results
Make sure to specify time parameters for historical data:
```bash
# ❌ Wrong - returns empty for historical data
curl 'http://localhost:8428/api/v1/query?query=battery_voltage_mv'

# ✅ Correct - specifies historical time
curl 'http://localhost:8428/api/v1/query?query=battery_voltage_mv&time=2025-11-11T12:00:00Z'
```

### Performance Tips
- Use label filters to reduce query scope
- Specify time ranges to limit data returned
- Use aggregation functions for large datasets
- Check query duration with vmui interface

## Security Notes

Current configuration is for **local development only**:
- No authentication enabled
- Binds to all interfaces (0.0.0.0)
- No TLS/SSL encryption

For production deployment, consider:
- Enable authentication
- Configure firewall rules
- Use reverse proxy with TLS
- Implement rate limiting
- Set up monitoring and alerting
