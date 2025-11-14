# 📊 IoT Report Utils

> **Modern, scalable IoT data report generation system with SVG templates and PDF export**

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/express-4.21.1-blue)](https://expressjs.com/)
[![TimescaleDB](https://img.shields.io/badge/timescaledb-latest-orange)](https://www.timescale.com/)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [SVG Template System](#-svg-template-system)
- [Configuration](#-configuration)
- [Development](#-development)
- [Future Enhancements](#-future-enhancements)

---

## 🎯 Overview

IoT Report Utils is a production-ready, modular system for generating professional PDF reports from IoT sensor data. Built with modern best practices, it features:

- 🎨 **SVG-based templates** for pixel-perfect reports
- 📈 **Time-series data analysis** with TimescaleDB
- 🔄 **Automated KPI calculations**
- 📊 **Dynamic chart generation** with Chart.js
- 🐳 **Containerized deployment** for portability
- 🤖 **AI-ready architecture** for future text-to-SQL integration (Ollama)

This system is purpose-built for IoT sensor data with SVG templates, time-series optimization, and modular scalability.

---

## ✨ Features

### 📄 Report Types

#### 🌡️ IoT Summary Report
- Overview of all sensors with latest readings
- Key performance indicators (KPIs)
- Time-series visualizations
- Customizable date ranges

#### 📊 Sensor Detailed Report
- Individual sensor analysis
- Statistical summaries (avg, min, max, stddev)
- Historical trends with multiple aggregation levels (raw, hourly, daily)

#### 🏢 Building Report
- All sensors in a specific building
- Environmental monitoring
- Comparative analysis across locations

### 🔥 Core Capabilities

| Feature | Description |
|---------|-------------|
| **SVG Templates** | Scalable, customizable report templates |
| **Puppeteer PDF** | High-quality PDF generation via headless Chrome |
| **TimescaleDB** | Optimized time-series database for IoT data |
| **Real-time KPIs** | Automated calculation of performance metrics |
| **Multi-sensor Analysis** | Compare multiple sensors simultaneously |
| **Flexible Querying** | Filter by sensor type, location, building, date range |
| **Report History** | Audit trail of all generated reports |
| **Health Monitoring** | Built-in health checks for all services |

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Stack                      │
│  ┌──────────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │  TimescaleDB     │  │ Report Service│  │ Ollama (opt) │ │
│  │  PostgreSQL 16   │◄─┤  Express.js   │◄─┤ Text-to-SQL  │ │
│  │  Port: 5432      │  │  Port: 3000   │  │ Port: 11434  │ │
│  └──────────────────┘  └───────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │
                    HTTP REST API
                           │
                           ▼
              ┌────────────────────────┐
              │   Client Applications  │
              └────────────────────────┘
```

### Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Express.js Server                       │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│                       Route Layer                            │
│  /api/reports  │  /api/sensors  │  /api/kpis  │  /health    │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│                    Controller Layer                          │
│  • reportController   - Report generation orchestration      │
│  • sensorController   - Sensor data queries                  │
│  • kpiController      - KPI calculations                     │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│                     Service Layer                            │
│  • iotDataService       - IoT data aggregation               │
│  • svgTemplateService   - Template processing                │
│  • pdfGenerationService - PDF conversion (Puppeteer)         │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│                   Data Access Layer                          │
│  • database.js      - PostgreSQL connection pool             │
│  • TimescaleDB      - Time-series optimized storage          │
└─────────────────────────────────────────────────────────────┘
```

### Report Generation Flow

```
1. Client Request
   ↓
2. Controller validates parameters
   ↓
3. IoT Data Service queries:
   ├─→ Sensors metadata
   ├─→ Time-series readings (aggregated)
   ├─→ KPI calculations
   └─→ Statistics
   ↓
4. SVG Template Service:
   ├─→ Load SVG template
   ├─→ Inject dynamic data
   └─→ Generate HTML wrapper with Chart.js
   ↓
5. PDF Generation Service (Puppeteer):
   ├─→ Launch headless browser
   ├─→ Render HTML + SVG
   ├─→ Wait for charts to load
   └─→ Convert to PDF
   ↓
6. Log report generation to database
   ↓
7. Return PDF to client
```

---

## 🛠️ Tech Stack

### Core Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Node.js 20+ (ESM) | JavaScript runtime with modern module system |
| **Framework** | Express.js 4.21 | Web server and REST API |
| **Database** | PostgreSQL 16 + TimescaleDB | Time-series optimized relational database |
| **PDF Engine** | Puppeteer 23.10 | Headless Chrome for HTML→PDF conversion |
| **Templates** | SVG + Chart.js | Scalable vector graphics with dynamic charts |
| **Validation** | Joi 17.13 | Request and configuration validation |
| **Logging** | Winston 3.17 | Structured logging with file rotation |
| **Date Handling** | date-fns 4.1 | Modern date manipulation library |

### DevOps & Security

- **Docker & Docker Compose** - Containerized deployment
- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **Compression** - Response compression
- **Morgan** - HTTP request logging
- **Connection Pooling** - Efficient database connections

### Future Integration

- **Ollama** - Local LLM for text-to-SQL queries (architecture ready)
- **Qwen2.5-Coder** - SQL generation from natural language

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- (Optional) Node.js 18+ for local development

### Option 1: Docker Compose (Recommended)

```bash
# Clone repository
cd /home/kmedrano/src/report_utils

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f report-service

# Access API
curl http://localhost:3000/health
```

**Services started:**
- TimescaleDB: `localhost:5432`
- Report Service: `localhost:3000`
- Ollama (optional): `localhost:11434`

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start TimescaleDB (required)
docker-compose up -d timescaledb

# Start server in development mode
npm run dev

# Server runs on http://localhost:3000
```

### Initial Setup

```bash
# Database is automatically initialized with:
# - IoT schemas (iot, reports)
# - Sample sensors (12 devices across 3 buildings)
# - 30 days of synthetic sensor data (~8,640 readings per sensor)
# - TimescaleDB hypertables and continuous aggregates
# - KPI definitions

# Verify setup
curl http://localhost:3000/api/sensors | jq
```

### Generate Your First Report

```bash
# Generate IoT summary report (PDF)
curl -X POST http://localhost:3000/api/reports/iot-summary \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "format": "pdf"
  }' \
  --output report.pdf

# Open report.pdf to view!
```

---

## 📡 API Documentation

### Base URL

```
http://localhost:3000/api
```

### Report Endpoints

#### Generate IoT Summary Report

```http
POST /api/reports/iot-summary
Content-Type: application/json

{
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z",
  "sensorIds": [1, 2, 3],  // Optional, omit for all sensors
  "filters": {              // Optional filters
    "building": "A",
    "sensor_type": "temperature"
  },
  "format": "pdf"          // "pdf" or "html"
}
```

**Response:** PDF file (`application/pdf`)

#### Generate Sensor Detailed Report

```http
POST /api/reports/sensor-detailed
Content-Type: application/json

{
  "sensorId": "TEMP-A101",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z",
  "aggregation": "hourly",  // "raw", "hourly", "daily"
  "format": "pdf"
}
```

#### Generate Building Report

```http
POST /api/reports/building
Content-Type: application/json

{
  "building": "A",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z"
}
```

#### Get Report Templates

```http
GET /api/reports/templates
```

#### Get Report History

```http
GET /api/reports/history?limit=50&offset=0
```

### Sensor Endpoints

#### Get All Sensors

```http
GET /api/sensors?sensor_type=temperature&location=Building%20A&is_active=true
```

**Response:**
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
      "is_active": true,
      "latest_value": 22.34,
      "latest_reading_time": "2024-01-31T23:55:00Z"
    }
  ],
  "count": 1
}
```

#### Get Sensor by ID

```http
GET /api/sensors/:id
```

#### Get Sensor Readings

```http
GET /api/sensors/:id/readings?startDate=2024-01-01&endDate=2024-01-31&aggregation=hourly
```

**Aggregation levels:**
- `raw` - All individual readings (5-minute intervals)
- `hourly` - Hourly aggregates (avg, min, max)
- `daily` - Daily aggregates (avg, min, max, stddev)

#### Get Sensor Statistics

```http
GET /api/sensors/:id/statistics?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reading_count": 8928,
    "avg_value": 22.45,
    "min_value": 18.23,
    "max_value": 26.78,
    "stddev_value": 1.89,
    "median_value": 22.41,
    "avg_quality": 95.4,
    "first_reading": "2024-01-01T00:00:00Z",
    "last_reading": "2024-01-31T23:55:00Z"
  }
}
```

#### Get Sensor Types

```http
GET /api/sensors/types
```

#### Compare Multiple Sensors

```http
POST /api/sensors/compare
Content-Type: application/json

{
  "sensorIds": [1, 2, 3],
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "aggregation": "daily"
}
```

### KPI Endpoints

#### Get All KPIs

```http
GET /api/kpis?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
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
        "start": "2024-01-01T00:00:00Z",
        "end": "2024-01-31T23:59:59Z"
      },
      "sample_count": 26784
    }
  ]
}
```

#### Get Specific KPI

```http
GET /api/kpis/:name?startDate=2024-01-01&endDate=2024-01-31
```

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-31T12:00:00Z",
  "uptime": 3600.5,
  "database": {
    "healthy": true,
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

---

## 🗄️ Database Schema

### TimescaleDB Optimization

The system uses TimescaleDB for efficient time-series data storage:

- **Hypertables** - Automatic partitioning of `sensor_readings` by time
- **Continuous Aggregates** - Pre-computed hourly and daily statistics
- **Retention Policies** - Automated data lifecycle management (configurable)

### Key Tables

#### `iot.sensor_types`
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR (e.g., 'temperature', 'humidity')
- unit: VARCHAR (e.g., '°C', '%')
- min_value / max_value: NUMERIC (valid range)
```

#### `iot.sensors`
```sql
- id: SERIAL PRIMARY KEY
- sensor_code: VARCHAR UNIQUE (e.g., 'TEMP-A101')
- sensor_type_id: INTEGER (FK)
- name: VARCHAR
- location: VARCHAR
- latitude / longitude: NUMERIC
- is_active: BOOLEAN
- metadata: JSONB (flexible additional data)
```

#### `iot.sensor_readings` (Hypertable)
```sql
- time: TIMESTAMPTZ (partition key)
- sensor_id: INTEGER (FK)
- value: NUMERIC
- quality: INTEGER (0-100)
- PRIMARY KEY (time, sensor_id)
```

#### `reports.templates`
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR UNIQUE
- svg_template_path: VARCHAR
- parameters: JSONB (expected parameters)
```

#### `reports.kpi_definitions`
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR UNIQUE
- calculation_type: VARCHAR (avg, min, max, sum, custom)
- sensor_type_id: INTEGER (FK, optional)
- sql_query: TEXT (for custom KPIs)
```

### Sample Data

The seed script (`docker/init-db/02-seed.sql`) creates:

- **10 sensor types** (temperature, humidity, pressure, CO2, light, motion, voltage, current, power, water flow)
- **12 sensors** across 3 buildings
- **~8,640 readings per sensor** (last 30 days, 5-minute intervals)
- **5 KPI definitions** (avg temperature, max CO2, total power, etc.)
- **4 report templates**

---

## 🎨 SVG Template System

### Template Structure

SVG templates use mustache-style placeholders:

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm">
  <!-- Static design elements -->
  <text>{{report_title}}</text>

  <!-- Dynamic data injection -->
  <text>{{sensor_name}}</text>
  <text>{{latest_value}} {{unit}}</text>

  <!-- Repeating elements -->
  {{sensor_rows}}

  <!-- Chart placeholder -->
  <foreignObject>
    <canvas id="chart"></canvas>
  </foreignObject>
</svg>
```

### Data Injection

The `svgTemplateService` handles:

1. **Placeholder replacement** - `{{key}}` → actual values
2. **Dynamic row generation** - Loops for sensors, readings
3. **XML escaping** - Prevents injection attacks
4. **Chart data** - JavaScript objects for Chart.js

### HTML Wrapper

SVG is wrapped in HTML with:

- **Chart.js** for dynamic visualizations
- **Render completion marker** - Signals Puppeteer when ready
- **Print-optimized CSS** - A4 format, proper margins

### Creating Custom Templates

1. Design SVG template in `src/templates/svg/my-template.svg`
2. Add placeholders: `{{my_data}}`
3. Create service method in `svgTemplateService.js`:

```javascript
async generateMyReport(reportData) {
  const template = await this.loadTemplate('my-template.svg');
  const data = { my_data: reportData.value };
  return this.replacePlaceholders(template, data);
}
```

4. Add controller method
5. Register route

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `SERVER_PORT` | HTTP server port | `3000` |
| `DB_HOST` | Database host | `timescaledb` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `iot_reports` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `DB_POOL_MIN` | Min connections | `2` |
| `DB_POOL_MAX` | Max connections | `10` |
| `PUPPETEER_HEADLESS` | Headless mode | `true` |
| `PUPPETEER_TIMEOUT` | PDF timeout (ms) | `30000` |
| `OLLAMA_ENABLED` | Enable Ollama | `false` |
| `OLLAMA_HOST` | Ollama API URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | LLM model name | `qwen2.5-coder:7b` |
| `LOG_LEVEL` | Logging level | `info` |

### Docker Compose Profiles

```bash
# Basic setup (DB + Report Service)
docker-compose up -d

# With pgAdmin for database management
docker-compose --profile dev up -d

# With Ollama for AI text-to-SQL
docker-compose --profile ai-enabled up -d

# Full stack
docker-compose --profile dev --profile ai-enabled up -d
```

---

## 👨‍💻 Development

### Project Structure

```
report_utils/
├── src/
│   ├── config/
│   │   ├── index.js              # Configuration with validation
│   │   └── database.js           # Database connection pool
│   ├── controllers/
│   │   ├── reportController.js   # Report generation
│   │   ├── sensorController.js   # Sensor queries
│   │   └── kpiController.js      # KPI calculations
│   ├── services/
│   │   ├── iotDataService.js     # IoT data aggregation
│   │   ├── svgTemplateService.js # Template processing
│   │   └── pdfGenerationService.js # PDF conversion
│   ├── routes/
│   │   ├── reportRoutes.js
│   │   ├── sensorRoutes.js
│   │   └── kpiRoutes.js
│   ├── middleware/
│   │   └── errorHandler.js       # Global error handling
│   ├── utils/
│   │   └── logger.js             # Winston logger
│   ├── templates/svg/
│   │   └── iot-summary-report.svg
│   └── index.js                  # Express app entry
├── scripts/
│   ├── diagnostics/
│   │   ├── dbConnectionTest.js   # Standalone DB connectivity check
│   │   └── ollamaModelsTest.js   # Qwen/Llama smoke tests
│   └── victoriametrics/
│       └── migrate.js            # Historical data importer
├── samples/
│   └── reports/
│       └── test-report.pdf       # Example output (generated)
├── docker/
│   ├── init-db/
│   │   ├── 01-init.sql           # Schema creation
│   │   └── 02-seed.sql           # Sample data
├── Dockerfile
├── docker-compose.yml
├── package.json
├── .env
└── README.md
```

### Utility Scripts & Samples

- `node scripts/diagnostics/dbConnectionTest.js` – quick sanity check for the TimescaleDB connection.
- `node scripts/diagnostics/ollamaModelsTest.js` – exercises local Ollama models (Qwen 2.5 + Llama 3.1) if you have the AI profile enabled.
- `node scripts/victoriametrics/migrate.js` – re-imports historical IoT metrics into VictoriaMetrics using the documented workflow.
- `samples/reports/test-report.pdf` – output location for `docs/TEST_TEMPLATE_USAGE.md` curl example (gitignored so feel free to overwrite).

### NPM Scripts

```bash
npm start          # Production server
npm run dev        # Development with auto-reload (nodemon)
npm run lint       # ESLint code quality check
npm test           # Run tests (not yet implemented)
npm run db:migrate # Run database migrations
npm run db:seed    # Seed database with sample data
```

### Adding New Features

#### New Report Type

1. **Create SVG template**: `src/templates/svg/new-report.svg`
2. **Add service method**: `svgTemplateService.js`
   ```javascript
   async generateNewReport(data) { ... }
   ```
3. **Add controller method**: `reportController.js`
   ```javascript
   async generateNewReport(req, res) { ... }
   ```
4. **Register route**: `reportRoutes.js`
   ```javascript
   router.post('/new-report', reportController.generateNewReport);
   ```
5. **Add to database**: Insert into `reports.templates`

#### New KPI

```sql
INSERT INTO reports.kpi_definitions (name, description, calculation_type, sensor_type_id, unit)
VALUES ('my-kpi', 'Description', 'avg', 1, 'unit');
```

#### New Sensor Type

```sql
INSERT INTO iot.sensor_types (name, unit, description, min_value, max_value)
VALUES ('pressure', 'Pa', 'Pressure sensor', 0, 200000);
```

### Logging

Logs are written to:
- Console (development)
- `logs/app.log` (all levels)
- `logs/app.error.log` (errors only)

Log rotation: 10MB max, 5 files retained

---

## 🔮 Future Enhancements

### Phase 2: AI-Powered Queries (Ollama Integration)

```javascript
// Example: Natural language to SQL
POST /api/query/natural

{
  "query": "Show me average temperature in Building A last week"
}

// System will:
// 1. Send to Ollama with Qwen2.5-Coder model
// 2. Generate SQL query
// 3. Execute against database
// 4. Return results with generated SQL
```

**Architecture ready:**
- Ollama service in docker-compose
- Configuration flags in `.env`
- Modular service structure for easy integration

### Phase 3: Advanced Analytics

- ✨ **Anomaly detection** - ML-based outlier identification
- 📧 **Scheduled reports** - Cron-based automatic generation
- 🔔 **Alerting** - Threshold-based notifications
- 📱 **Real-time dashboards** - WebSocket streaming
- 🌐 **Multi-tenancy** - Organization/user isolation
- 🔐 **Authentication** - JWT-based API security

### Phase 4: Performance Optimization

- ⚡ **Redis caching** - Report caching layer
- 📦 **PDF compression** - Ghostscript post-processing
- 🔄 **Report queue** - Bull/BullMQ for async generation
- 📊 **GraphQL API** - Alternative to REST
- 🚀 **Horizontal scaling** - Multiple report service instances

---

## 📝 Comparison: report_utils vs treeads-report

| Feature | treeads-report | report_utils (IoT) |
|---------|----------------|-------------------|
| **Use Case** | Geospatial wildfire reports | IoT sensor analytics |
| **Templates** | EJS HTML | SVG + HTML |
| **Data Source** | GeoServer, GEE, NASA | PostgreSQL/TimescaleDB |
| **Database** | External services | Self-contained time-series DB |
| **Maps** | Azure Maps, OpenLayers | No maps (sensor data) |
| **Charts** | Chart.js embedded | Chart.js in SVG |
| **Scalability** | Monolithic | Modular microservice-ready |
| **AI Integration** | None | Ollama ready |
| **Docker** | Basic | Multi-service compose |
| **API Design** | Mixed | RESTful consistent |
| **Logging** | Basic | Structured Winston |
| **Health Checks** | Limited | Comprehensive |

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📧 Support

For issues or questions:
- Open a GitHub issue
- Contact the development team
- Check logs: `docker-compose logs report-service`

---

<div align="center">

**Built with 🔥 for scalable IoT analytics**

🌡️ 💧 📊 🚀

</div>
