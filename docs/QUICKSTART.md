# ⚡ Quick Start Guide

Get your IoT Report Utils system running in 5 minutes!

---

## 🚀 Step 1: Start the System

```bash
cd /home/kmedrano/src/report_utils

# Start all services
docker-compose up -d

# Wait ~30 seconds for initialization
# Check if services are healthy
docker-compose ps
```

Expected output:
```
NAME                 STATUS         PORTS
iot-report-service   Up (healthy)   0.0.0.0:3000->3000/tcp
iot-timescaledb      Up (healthy)   0.0.0.0:5432->5432/tcp
```

---

## 🔍 Step 2: Verify Installation

```bash
# Check API health
curl http://localhost:3000/health | jq

# Should return:
# {
#   "success": true,
#   "database": { "healthy": true },
#   "pdfService": { "healthy": true }
# }
```

---

## 📊 Step 3: Explore Sample Data

### View All Sensors

```bash
curl http://localhost:3000/api/sensors | jq
```

You'll see 12 pre-seeded sensors:
- **Building A**: 6 sensors (temperature, humidity, CO2, light)
- **Building B**: 3 sensors (temperature, humidity, power)
- **Building C**: 3 sensors (temperature, pressure, water flow)

### Get Sensor Readings

```bash
curl "http://localhost:3000/api/sensors/TEMP-A101/readings?aggregation=daily" | jq
```

### View KPIs

```bash
curl http://localhost:3000/api/kpis | jq
```

---

## 📄 Step 4: Generate Your First Report

### Option A: PDF Report (Full Featured)

```bash
curl -X POST http://localhost:3000/api/reports/iot-summary \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-11-01T00:00:00Z",
    "endDate": "2024-11-11T23:59:59Z",
    "format": "pdf"
  }' \
  --output my-iot-report.pdf

# Open the PDF
xdg-open my-iot-report.pdf  # Linux
# open my-iot-report.pdf    # macOS
# start my-iot-report.pdf   # Windows
```

### Option B: HTML Preview (Fast)

```bash
curl -X POST http://localhost:3000/api/reports/iot-summary \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-11-01T00:00:00Z",
    "endDate": "2024-11-11T23:59:59Z",
    "format": "html"
  }' \
  --output report.html

# Open in browser
xdg-open report.html
```

---

## 🎯 Step 5: Try Different Reports

### Specific Sensors Only

```bash
curl -X POST http://localhost:3000/api/reports/iot-summary \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-11-01",
    "endDate": "2024-11-11",
    "sensorIds": ["TEMP-A101", "HUM-A101", "CO2-A101"],
    "format": "pdf"
  }' \
  --output building-a-report.pdf
```

### Filter by Building

```bash
curl -X POST http://localhost:3000/api/reports/building \
  -H "Content-Type: application/json" \
  -d '{
    "building": "A",
    "startDate": "2024-11-01",
    "endDate": "2024-11-11"
  }' | jq
```

### Sensor Detailed Analysis

```bash
curl -X POST http://localhost:3000/api/reports/sensor-detailed \
  -H "Content-Type: application/json" \
  -d '{
    "sensorId": "TEMP-A101",
    "startDate": "2024-11-01",
    "endDate": "2024-11-11",
    "aggregation": "hourly"
  }' | jq
```

---

## 🔧 Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Restart services
docker-compose down
docker-compose up -d
```

### Database connection errors

```bash
# Check database
docker-compose exec timescaledb psql -U postgres -d iot_reports -c "\dt iot.*"

# Re-initialize database
docker-compose down -v  # WARNING: Deletes data
docker-compose up -d
```

### PDF generation timeout

```bash
# Increase timeout in .env
PUPPETEER_TIMEOUT=60000
REPORT_TIMEOUT=120000

# Restart
docker-compose restart report-service
```

---

## 🛠️ Development Mode

### Local Development

```bash
# Start only database
docker-compose up -d timescaledb

# Install dependencies
npm install

# Run dev server with auto-reload
npm run dev
```

### Access Database Management UI

```bash
# Start pgAdmin
docker-compose --profile dev up -d

# Access at: http://localhost:5050
# Email: admin@admin.com
# Password: admin

# Add server:
# Host: timescaledb
# Port: 5432
# Database: iot_reports
# Username: postgres
# Password: postgres
```

---

## 📚 Next Steps

1. **Read the full README**: `/home/kmedrano/src/report_utils/README.md`
2. **Explore API**: Try all endpoints documented in README
3. **Customize templates**: Edit `src/templates/svg/iot-summary-report.svg`
4. **Add your sensors**: Insert into `iot.sensors` table
5. **Create custom KPIs**: Add to `reports.kpi_definitions`

---

## 🎨 Customization Examples

### Add a New Sensor

```sql
docker-compose exec timescaledb psql -U postgres -d iot_reports

INSERT INTO iot.sensors (sensor_code, sensor_type_id, name, location)
VALUES ('TEMP-D101', 1, 'My Temperature Sensor', 'Building D - Room 101');
```

### Add Readings

```sql
INSERT INTO iot.sensor_readings (time, sensor_id, value, quality)
VALUES (NOW(), 13, 23.5, 100);
```

### Create Custom KPI

```sql
INSERT INTO reports.kpi_definitions (name, description, calculation_type, sensor_type_id, unit)
VALUES (
  'avg-building-temp',
  'Average temperature in all buildings',
  'avg',
  1,
  '°C'
);
```

---

## 📞 Need Help?

- **Check logs**: `docker-compose logs -f report-service`
- **Health status**: `curl http://localhost:3000/health | jq`
- **Database status**: `docker-compose exec timescaledb pg_isready`
- **Full documentation**: See README.md

---

## 🎉 Success Indicators

✅ All services show "Up (healthy)" status
✅ Health endpoint returns `"success": true`
✅ Sensors endpoint returns 12 sensors
✅ PDF report generated successfully
✅ Report contains data and charts

**Congratulations! Your IoT Report Utils system is ready! 🚀**
