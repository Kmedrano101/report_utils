# Prometheus & VictoriaMetrics Integration

## Overview

The IoT Report Utils system now supports integration with **Prometheus** and **VictoriaMetrics** for time-series data storage and querying alongside the built-in TimescaleDB.

## Architecture

```
┌─────────────────────────────────────┐
│   IoT Report Utils Dashboard        │
│   - System Health Monitoring        │
│   - Service Status Display          │
└───────────┬─────────────────────────┘
            │
            ├─────────────────────────┬─────────────────────────┐
            │                         │                         │
    ┌───────▼────────┐       ┌───────▼────────┐     ┌─────────▼────────┐
    │  TimescaleDB   │       │   Prometheus   │     │ VictoriaMetrics  │
    │   (Primary)    │       │  (Metrics)     │     │  (MetricsQL)     │
    └────────────────┘       └────────────────┘     └──────────────────┘
```

## Features

### Dashboard Integration

The dashboard now displays real-time status for:

1. **System Health** - Application uptime, memory usage
2. **Database Status** - TimescaleDB connection and pool status
3. **PDF Reports** - Generation statistics
4. **Prometheus** - Connection status, metrics count, last scrape time
5. **VictoriaMetrics** - Connection status, query engine, storage info

### Configuration Options

#### Database Configuration Tab

Three profile options are available:

1. **Default (Built-in TimescaleDB)** - Uses the local TimescaleDB instance
2. **Prometheus / VictoriaMetrics** - Configure external time-series databases
3. **Custom Configuration** - Manual database configuration

#### External Time-Series Databases Section

Configure connections to:
- **Prometheus URL**: Default `http://localhost:9090`
- **VictoriaMetrics URL**: Default `http://localhost:8428`

## API Endpoints

### Prometheus

The system checks Prometheus using standard API endpoints:

- **Config**: `GET /api/v1/status/config`
- **Metrics List**: `GET /api/v1/label/__name__/values`
- **Query**: `GET /api/v1/query?query=<query>`

### VictoriaMetrics

VictoriaMetrics provides Prometheus-compatible API plus additional features:

- **Status**: `GET /api/v1/status/tsdb`
- **Query**: `GET /api/v1/query?query=<query>`
- **MetricsQL**: Enhanced query language with additional functions

## MetricsQL Queries

VictoriaMetrics supports **MetricsQL**, an extension of PromQL with additional features:

### Basic Queries
```promql
# Get all "up" metrics
up

# Average CPU usage
avg(cpu_usage_percent)

# Memory usage by host
memory_usage_bytes{host="server-01"}
```

### Advanced MetricsQL Functions
```promql
# Rollup over time range
avg_over_time(cpu_usage[5m])

# Aggregation
sum(rate(http_requests_total[5m])) by (status_code)

# Filtering
http_requests_total{status_code!="200"}
```

## Configuration Storage

Settings are stored in **localStorage**:

```javascript
{
  "prometheusUrl": "http://localhost:9090",
  "victoriaUrl": "http://localhost:8428",
  "profile": "prometheus",
  // ... other database configs
}
```

## Testing Connections

### From UI

1. Navigate to **Database Config** tab
2. Select **Prometheus / VictoriaMetrics** profile
3. Configure URLs
4. Click **Test External Services**
5. View connection results in dashboard

### Manual Testing

#### Test Prometheus
```bash
curl http://localhost:9090/api/v1/query?query=up
```

#### Test VictoriaMetrics
```bash
curl http://localhost:8428/api/v1/query?query=up
```

## CORS Configuration

For browser-based queries to external services, ensure CORS is enabled:

### Prometheus
```yaml
# prometheus.yml
global:
  external_labels:
    cluster: 'my-cluster'

# Enable CORS via reverse proxy (nginx example)
```

### VictoriaMetrics
VictoriaMetrics has built-in CORS support:

```bash
./victoria-metrics \
  -httpListenAddr=:8428 \
  -http.pathPrefix=/
```

## Status Indicators

### Color Codes

- 🟢 **Green (✓ Connected)** - Service is reachable and responding
- 🟡 **Yellow (⚠ Not configured)** - URL not configured or no data
- 🔴 **Red (✗ Disconnected)** - Service unavailable or error

### Refresh Rate

The dashboard auto-checks external services:
- **On page load** - Initial status check
- **On tab change** - When returning to Dashboard
- **Manual refresh** - Click the Refresh button

## Integration Benefits

### Why Prometheus?

1. **Industry Standard** - Wide adoption in cloud-native environments
2. **Pull-based** - Scrapes metrics from configured targets
3. **Service Discovery** - Automatic target discovery
4. **Alerting** - Built-in alert manager

### Why VictoriaMetrics?

1. **Performance** - Up to 10x more efficient than Prometheus
2. **MetricsQL** - Enhanced query language
3. **Long-term Storage** - Better compression and retention
4. **PromQL Compatible** - Drop-in replacement
5. **Clustering** - Horizontal scalability

## Use Cases

### Scenario 1: IoT Metrics Collection
```
Sensors → Prometheus Exporters → Prometheus → Report Utils
```

### Scenario 2: High-Volume Time-Series
```
Sensors → Remote Write → VictoriaMetrics → Report Utils
```

### Scenario 3: Hybrid Architecture
```
Sensors → TimescaleDB (relational data)
       → VictoriaMetrics (time-series metrics)
       → Report Utils (unified reporting)
```

## Troubleshooting

### Connection Issues

**Problem**: "✗ Disconnected" status

**Solutions**:
1. Verify service is running: `curl http://localhost:9090/-/healthy`
2. Check firewall rules
3. Enable CORS if accessing from browser
4. Verify URL format includes protocol (`http://` or `https://`)

### CORS Errors

**Problem**: Browser blocks cross-origin requests

**Solutions**:
1. Use reverse proxy (nginx, traefik)
2. Enable CORS headers on Prometheus/VictoriaMetrics
3. Use same-origin deployment

### Metrics Not Appearing

**Problem**: Metrics count shows 0 or N/A

**Solutions**:
1. Verify Prometheus is scraping targets: `http://localhost:9090/targets`
2. Check VictoriaMetrics retention policy
3. Ensure data is being written to the database

## Best Practices

1. **Use VictoriaMetrics for long-term storage** - Better compression
2. **Keep Prometheus for real-time alerting** - Fast query performance
3. **Configure appropriate retention periods** - Balance storage vs. history
4. **Use MetricsQL for complex queries** - More powerful than PromQL
5. **Monitor connection health** - Set up alerting for service availability

## Further Reading

- [Prometheus Documentation](https://prometheus.io/docs/)
- [VictoriaMetrics Documentation](https://docs.victoriametrics.com/)
- [MetricsQL Guide](https://docs.victoriametrics.com/MetricsQL.html)
- [PromQL Tutorial](https://prometheus.io/docs/prometheus/latest/querying/basics/)

## Support

For issues or questions about Prometheus/VictoriaMetrics integration:

1. Check service logs
2. Verify API endpoints are accessible
3. Review CORS configuration
4. Consult official documentation
