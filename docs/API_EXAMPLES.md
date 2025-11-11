# 📡 API Examples Collection

Complete examples for all API endpoints with sample responses.

---

## 🏥 Health & Status

### Health Check
```bash
curl http://localhost:3000/health | jq
```

<details>
<summary>Response</summary>

```json
{
  "success": true,
  "timestamp": "2024-11-11T12:00:00Z",
  "uptime": 3600.5,
  "database": {
    "healthy": true,
    "timestamp": "2024-11-11T12:00:00Z",
    "poolTotal": 10,
    "poolIdle": 8,
    "poolWaiting": 0
  },
  "pdfService": {
    "healthy": true,
    "initialized": true,
    "version": "Chrome/120.0.0.0",
    "pages": 0
  },
  "memory": {
    "used": 125,
    "total": 256
  }
}
```
</details>

### API Info
```bash
curl http://localhost:3000/ | jq
```

---

## 📊 Sensor Endpoints

### 1. Get All Sensors
```bash
curl http://localhost:3000/api/sensors | jq
```

### 2. Get Sensors with Filters
```bash
# By sensor type
curl "http://localhost:3000/api/sensors?sensor_type=temperature" | jq

# By location
curl "http://localhost:3000/api/sensors?location=Building%20A" | jq

# By building
curl "http://localhost:3000/api/sensors?building=A" | jq

# Active sensors only
curl "http://localhost:3000/api/sensors?is_active=true" | jq

# Combined filters
curl "http://localhost:3000/api/sensors?sensor_type=temperature&building=A&is_active=true" | jq
```

<details>
<summary>Response Example</summary>

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "sensor_code": "TEMP-A101",
      "name": "Temperature Sensor A101",
      "sensor_type": "temperature",
      "unit": "°C",
      "location": "Building A - Room 101",
      "latitude": 40.4168,
      "longitude": -3.7038,
      "is_active": true,
      "metadata": {
        "floor": 1,
        "building": "A",
        "room": "101"
      },
      "latest_value": 22.34,
      "latest_reading_time": "2024-11-11T11:55:00Z"
    }
  ],
  "count": 1
}
```
</details>

### 3. Get Sensor by ID
```bash
# By sensor ID
curl http://localhost:3000/api/sensors/1 | jq

# By sensor code
curl http://localhost:3000/api/sensors/TEMP-A101 | jq
```

### 4. Get Sensor Readings
```bash
# Raw data (5-minute intervals)
curl "http://localhost:3000/api/sensors/TEMP-A101/readings?aggregation=raw&startDate=2024-11-11T00:00:00Z&endDate=2024-11-11T23:59:59Z" | jq

# Hourly aggregates
curl "http://localhost:3000/api/sensors/TEMP-A101/readings?aggregation=hourly&startDate=2024-11-01&endDate=2024-11-11" | jq

# Daily aggregates (last 30 days by default)
curl "http://localhost:3000/api/sensors/TEMP-A101/readings?aggregation=daily" | jq
```

<details>
<summary>Response Example (hourly)</summary>

```json
{
  "success": true,
  "data": [
    {
      "time": "2024-11-11T00:00:00Z",
      "value": 21.45,
      "min_value": 21.12,
      "max_value": 21.78,
      "reading_count": 12,
      "quality": 95.5
    },
    {
      "time": "2024-11-11T01:00:00Z",
      "value": 21.23,
      "min_value": 20.98,
      "max_value": 21.45,
      "reading_count": 12,
      "quality": 96.2
    }
  ],
  "count": 24,
  "parameters": {
    "startDate": "2024-11-11T00:00:00Z",
    "endDate": "2024-11-11T23:59:59Z",
    "aggregation": "hourly"
  }
}
```
</details>

### 5. Get Sensor Statistics
```bash
curl "http://localhost:3000/api/sensors/TEMP-A101/statistics?startDate=2024-10-01&endDate=2024-11-11" | jq
```

<details>
<summary>Response Example</summary>

```json
{
  "success": true,
  "data": {
    "reading_count": 11520,
    "avg_value": 22.45,
    "min_value": 18.23,
    "max_value": 26.78,
    "stddev_value": 1.89,
    "median_value": 22.41,
    "avg_quality": 95.4,
    "first_reading": "2024-10-01T00:00:00Z",
    "last_reading": "2024-11-11T23:55:00Z"
  },
  "parameters": {
    "startDate": "2024-10-01",
    "endDate": "2024-11-11"
  }
}
```
</details>

### 6. Get Sensor Types
```bash
curl http://localhost:3000/api/sensors/types | jq
```

<details>
<summary>Response Example</summary>

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "temperature",
      "unit": "°C",
      "description": "Temperature sensor",
      "min_value": -40,
      "max_value": 85
    },
    {
      "id": 2,
      "name": "humidity",
      "unit": "%",
      "description": "Relative humidity sensor",
      "min_value": 0,
      "max_value": 100
    }
  ]
}
```
</details>

### 7. Compare Multiple Sensors
```bash
curl -X POST http://localhost:3000/api/sensors/compare \
  -H "Content-Type: application/json" \
  -d '{
    "sensorIds": ["TEMP-A101", "TEMP-A201", "TEMP-B101"],
    "startDate": "2024-11-01",
    "endDate": "2024-11-11",
    "aggregation": "daily"
  }' | jq
```

---

## 📈 KPI Endpoints

### 1. Get All KPIs
```bash
# Last 7 days (default)
curl http://localhost:3000/api/kpis | jq

# Custom date range
curl "http://localhost:3000/api/kpis?startDate=2024-11-01&endDate=2024-11-11" | jq
```

<details>
<summary>Response Example</summary>

```json
{
  "success": true,
  "data": [
    {
      "kpi_name": "avg-temperature",
      "description": "Average temperature across all temperature sensors",
      "value": 22.45,
      "unit": "°C",
      "calculation_type": "avg",
      "period": {
        "start": "2024-11-01T00:00:00Z",
        "end": "2024-11-11T23:59:59Z"
      },
      "sample_count": 26784
    },
    {
      "kpi_name": "max-co2",
      "description": "Maximum CO2 level recorded",
      "value": 678.5,
      "unit": "ppm",
      "calculation_type": "max",
      "period": {
        "start": "2024-11-01T00:00:00Z",
        "end": "2024-11-11T23:59:59Z"
      },
      "sample_count": 8928
    },
    {
      "kpi_name": "total-power-consumption",
      "description": "Total power consumption",
      "value": 1234.56,
      "unit": "kWh",
      "calculation_type": "sum",
      "period": {
        "start": "2024-11-01T00:00:00Z",
        "end": "2024-11-11T23:59:59Z"
      },
      "sample_count": 2976
    }
  ],
  "parameters": {
    "startDate": "2024-11-01T00:00:00Z",
    "endDate": "2024-11-11T23:59:59Z"
  }
}
```
</details>

### 2. Get Specific KPI
```bash
curl "http://localhost:3000/api/kpis/avg-temperature?startDate=2024-11-01&endDate=2024-11-11" | jq
```

---

## 📄 Report Endpoints

### 1. Generate IoT Summary Report (PDF)
```bash
curl -X POST http://localhost:3000/api/reports/iot-summary \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-11-01T00:00:00Z",
    "endDate": "2024-11-11T23:59:59Z",
    "format": "pdf"
  }' \
  --output iot-summary-report.pdf
```

### 2. Generate IoT Summary Report (HTML Preview)
```bash
curl -X POST http://localhost:3000/api/reports/iot-summary \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-11-01",
    "endDate": "2024-11-11",
    "format": "html"
  }' \
  --output iot-summary-report.html
```

### 3. Generate Report for Specific Sensors
```bash
curl -X POST http://localhost:3000/api/reports/iot-summary \
  -H "Content-Type: application/json" \
  -d '{
    "sensorIds": [1, 2, 3],
    "startDate": "2024-11-01",
    "endDate": "2024-11-11",
    "format": "pdf"
  }' \
  --output selected-sensors-report.pdf
```

### 4. Generate Report with Filters
```bash
curl -X POST http://localhost:3000/api/reports/iot-summary \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "building": "A",
      "sensor_type": "temperature"
    },
    "startDate": "2024-11-01",
    "endDate": "2024-11-11",
    "format": "pdf"
  }' \
  --output building-a-temp-report.pdf
```

### 5. Generate Sensor Detailed Report
```bash
curl -X POST http://localhost:3000/api/reports/sensor-detailed \
  -H "Content-Type: application/json" \
  -d '{
    "sensorId": "TEMP-A101",
    "startDate": "2024-11-01",
    "endDate": "2024-11-11",
    "aggregation": "hourly",
    "format": "pdf"
  }' | jq
```

### 6. Generate Building Report
```bash
curl -X POST http://localhost:3000/api/reports/building \
  -H "Content-Type: application/json" \
  -d '{
    "building": "A",
    "startDate": "2024-11-01",
    "endDate": "2024-11-11"
  }' | jq
```

### 7. Get Report Templates
```bash
curl http://localhost:3000/api/reports/templates | jq
```

<details>
<summary>Response Example</summary>

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "iot-summary-report",
      "description": "IoT Sensor Summary Report - Overview of all sensors and latest readings",
      "svg_template_path": "templates/svg/iot-summary-report.svg",
      "parameters": {
        "sensors": [],
        "date_range": {
          "start": "date",
          "end": "date"
        },
        "include_charts": true
      },
      "created_at": "2024-11-11T10:00:00Z",
      "updated_at": "2024-11-11T10:00:00Z"
    }
  ]
}
```
</details>

### 8. Get Report Generation History
```bash
curl "http://localhost:3000/api/reports/history?limit=10" | jq
```

<details>
<summary>Response Example</summary>

```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "template_id": 1,
      "template_name": "iot-summary-report",
      "report_name": "IoT Summary Report",
      "parameters": {
        "startDate": "2024-11-01",
        "endDate": "2024-11-11",
        "sensorCount": 12
      },
      "file_size_kb": 245,
      "generation_time_ms": 3420,
      "status": "generated",
      "created_at": "2024-11-11T11:30:00Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 5
  }
}
```
</details>

---

## 🧪 Advanced Examples

### Time-Series Analysis
```bash
# Get hourly data for last 24 hours
START=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)
END=$(date -u +%Y-%m-%dT%H:%M:%SZ)

curl "http://localhost:3000/api/sensors/TEMP-A101/readings?startDate=$START&endDate=$END&aggregation=hourly" | jq
```

### Multi-Building Comparison
```bash
# Get all sensors from multiple buildings
for building in A B C; do
  echo "=== Building $building ==="
  curl "http://localhost:3000/api/sensors?building=$building" | jq '.data[] | {name, sensor_type, latest_value}'
done
```

### KPI Dashboard Data
```bash
# Fetch all KPIs for dashboard
curl http://localhost:3000/api/kpis | jq '[.data[] | {name: .kpi_name, value, unit}]'
```

### Generate Reports for All Buildings
```bash
for building in A B C; do
  curl -X POST http://localhost:3000/api/reports/building \
    -H "Content-Type: application/json" \
    -d "{
      \"building\": \"$building\",
      \"startDate\": \"2024-11-01\",
      \"endDate\": \"2024-11-11\"
    }" > "building-$building-report.json"
  echo "Generated report for Building $building"
done
```

---

## 🔒 Error Handling Examples

### Invalid Sensor ID
```bash
curl http://localhost:3000/api/sensors/INVALID-SENSOR | jq
```
```json
{
  "success": false,
  "error": "Sensor not found: INVALID-SENSOR"
}
```

### Missing Required Parameter
```bash
curl -X POST http://localhost:3000/api/reports/sensor-detailed \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2024-11-01"}' | jq
```
```json
{
  "success": false,
  "error": "sensorId is required"
}
```

### Invalid Date Format
```bash
curl "http://localhost:3000/api/sensors/1/readings?startDate=invalid-date" | jq
```

---

## 💡 Tips

1. **Use jq for formatting**: `| jq` makes JSON readable
2. **Save responses**: `> output.json` to save data
3. **Time zones**: Use ISO 8601 format with timezone (`2024-11-11T00:00:00Z`)
4. **Pagination**: Use `limit` and `offset` query params
5. **Aggregation levels**:
   - `raw` for detailed analysis (slower)
   - `hourly` for recent trends
   - `daily` for historical overview

---

## 📥 Import to Postman/Insomnia

Save this as a Postman collection:

```json
{
  "info": {
    "name": "IoT Report Utils API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/health"
      }
    },
    {
      "name": "Get All Sensors",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/api/sensors"
      }
    },
    {
      "name": "Generate IoT Summary Report",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"startDate\":\"2024-11-01\",\"endDate\":\"2024-11-11\",\"format\":\"pdf\"}"
        },
        "url": "http://localhost:3000/api/reports/iot-summary"
      }
    }
  ]
}
```

---

**For more examples, see the [README.md](../README.md)**
