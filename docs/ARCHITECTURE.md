# 🏗️ Architecture Documentation

Detailed technical architecture of IoT Report Utils system.

---

## 📐 System Design Principles

### 1. Modularity
- **Separation of Concerns**: Each module has a single responsibility
- **Loose Coupling**: Modules interact through well-defined interfaces
- **High Cohesion**: Related functionality grouped together

### 2. Scalability
- **Horizontal Scaling**: Stateless services can be replicated
- **Database Optimization**: TimescaleDB for efficient time-series queries
- **Connection Pooling**: Efficient database connection management
- **Caching Ready**: Architecture supports Redis integration

### 3. Maintainability
- **Clean Code**: ESM modules, async/await, clear naming
- **Comprehensive Logging**: Winston with structured logging
- **Error Handling**: Centralized error middleware
- **Configuration Management**: Environment-based config with validation

### 4. Reliability
- **Health Checks**: All services expose health endpoints
- **Graceful Shutdown**: Proper cleanup on SIGTERM/SIGINT
- **Error Recovery**: Retry logic and fallbacks
- **Data Validation**: Joi schema validation

---

## 🎯 Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Presentation Layer                  │
│  • Express Routes                                    │
│  • Request Validation                                │
│  • Response Formatting                               │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│                  Controller Layer                    │
│  • Business Logic Orchestration                      │
│  • Request/Response Transformation                   │
│  • Error Handling                                    │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│                   Service Layer                      │
│  • Core Business Logic                               │
│  • Data Aggregation                                  │
│  • External Service Integration                      │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│                Data Access Layer                     │
│  • Database Queries                                  │
│  • Connection Management                             │
│  • Transaction Handling                              │
└─────────────────────────────────────────────────────┘
```

---

## 📦 Module Breakdown

### Configuration Module (`src/config/`)

**Purpose**: Centralize all configuration with validation

**Files**:
- `index.js` - Main configuration with Joi validation
- `database.js` - PostgreSQL connection pool manager

**Key Features**:
- Environment variable validation
- Type coercion (string→number, etc.)
- Default values
- Error on invalid config

**Usage**:
```javascript
import config from './config/index.js';
console.log(config.server.port); // 3000
```

---

### Service Layer (`src/services/`)

#### IoT Data Service

**Responsibility**: IoT sensor data queries and KPI calculations

**Key Methods**:
```javascript
// Sensor operations
async getSensors(filters)
async getSensorById(id)
async getSensorReadings(id, start, end, aggregation)
async getSensorStatistics(id, start, end)

// KPI operations
async calculateKPI(name, start, end)
async getAllKPIs(start, end)

// Advanced queries
async getMultipleSensorData(ids, start, end, aggregation)
async getBuildingSummary(building, start, end)
```

**Design Patterns**:
- **Singleton**: Single instance shared across application
- **Repository Pattern**: Abstracts data access
- **Promise-based**: All async operations return Promises

#### SVG Template Service

**Responsibility**: SVG template loading and data injection

**Key Methods**:
```javascript
async loadTemplate(name, useCache)
replacePlaceholders(template, data)
generateIoTSummaryReport(reportData)
generateHtmlWithSvg(svg, chartData)
```

**Features**:
- Template caching for performance
- XML escaping for security
- Dynamic row generation
- Chart.js integration

#### PDF Generation Service

**Responsibility**: Puppeteer-based PDF conversion

**Key Methods**:
```javascript
async initialize()
async generatePdfFromHtml(html, options)
async generateAndSavePdf(html, path, options)
async healthCheck()
async close()
```

**Design Patterns**:
- **Singleton**: Single browser instance
- **Factory**: Creates new pages per request
- **Resource Pool**: Browser page lifecycle management

**Lifecycle**:
```
Initialize (app start)
  ↓
Launch Puppeteer browser (persistent)
  ↓
[For each request]
  → Create new page
  → Render content
  → Generate PDF
  → Close page
  ↓
Close browser (app shutdown)
```

---

### Controller Layer (`src/controllers/`)

**Responsibility**: HTTP request handling and orchestration

**Pattern**: Each controller handles one resource type

#### Report Controller
```javascript
// Report generation
async generateIoTSummaryReport(req, res)
async generateSensorDetailedReport(req, res)
async generateBuildingReport(req, res)

// Management
async getTemplates(req, res)
async getReportHistory(req, res)
```

#### Sensor Controller
```javascript
async getSensors(req, res)
async getSensorById(req, res)
async getSensorReadings(req, res)
async getSensorStatistics(req, res)
async getSensorTypes(req, res)
async compareSensors(req, res)
```

#### KPI Controller
```javascript
async getAllKPIs(req, res)
async getKPI(req, res)
```

**Response Format**:
```javascript
// Success
{
  success: true,
  data: {...},
  count: 10  // optional
}

// Error
{
  success: false,
  error: "Error message"
}
```

---

### Route Layer (`src/routes/`)

**Responsibility**: URL mapping to controllers

**Pattern**: RESTful API design

```javascript
// reportRoutes.js
POST   /api/reports/iot-summary
POST   /api/reports/sensor-detailed
POST   /api/reports/building
GET    /api/reports/templates
GET    /api/reports/history

// sensorRoutes.js
GET    /api/sensors
GET    /api/sensors/types
GET    /api/sensors/:id
GET    /api/sensors/:id/readings
GET    /api/sensors/:id/statistics
POST   /api/sensors/compare

// kpiRoutes.js
GET    /api/kpis
GET    /api/kpis/:name
```

---

## 🗄️ Database Architecture

### TimescaleDB Optimization

**Hypertable**: `iot.sensor_readings`
- Automatic partitioning by time
- Optimized for time-series queries
- Efficient data retention policies

**Continuous Aggregates**:
```sql
-- Pre-computed for fast queries
iot.sensor_readings_hourly   -- Avg, min, max per hour
iot.sensor_readings_daily    -- Daily statistics
```

**Refresh Policies**:
- Hourly: Refreshes every 1 hour (3-hour window)
- Daily: Refreshes every 24 hours (3-day window)

### Schema Organization

```
iot_reports (database)
├── iot (schema)
│   ├── sensor_types
│   ├── sensors
│   ├── sensor_readings (hypertable)
│   ├── sensor_readings_hourly (continuous aggregate)
│   ├── sensor_readings_daily (continuous aggregate)
│   └── views:
│       ├── latest_sensor_readings
│       └── sensors_with_latest
├── reports (schema)
│   ├── templates
│   ├── generated_reports
│   └── kpi_definitions
└── public (schema)
    └── (system tables)
```

### Query Optimization

**1. Indexes**:
```sql
-- Fast sensor lookups
CREATE INDEX idx_sensors_type ON iot.sensors(sensor_type_id);
CREATE INDEX idx_sensors_active ON iot.sensors(is_active);

-- Time-series queries
CREATE INDEX idx_sensor_readings_sensor_time
  ON iot.sensor_readings(sensor_id, time DESC);
```

**2. Materialized Views**:
```sql
-- Latest readings (fast access)
CREATE VIEW iot.latest_sensor_readings AS
  SELECT DISTINCT ON (sensor_id) *
  FROM iot.sensor_readings
  ORDER BY sensor_id, time DESC;
```

**3. Connection Pooling**:
```javascript
min: 2,     // Always maintain 2 connections
max: 10,    // Max 10 concurrent connections
idleTimeoutMillis: 30000,
connectionTimeoutMillis: 5000
```

---

## 🔄 Request Flow

### PDF Report Generation Flow

```
1. Client Request
   POST /api/reports/iot-summary
   Body: {startDate, endDate, sensorIds}
   │
   ├─→ Express Middleware
   │   ├─ Helmet (security headers)
   │   ├─ CORS validation
   │   ├─ Body parsing (JSON)
   │   └─ Request logging (Morgan)
   │
   ├─→ Route Handler
   │   reportRoutes.js → reportController.generateIoTSummaryReport
   │
   ├─→ Controller
   │   ├─ Validate request parameters
   │   ├─ Call services in parallel
   │   │
   │   ├─→ iotDataService.getSensors(sensorIds)
   │   │   └─→ Database query → PostgreSQL
   │   │
   │   ├─→ iotDataService.getAllKPIs(startDate, endDate)
   │   │   └─→ Multiple database queries → Aggregation
   │   │
   │   └─ Wait for all data
   │
   ├─→ SVG Template Service
   │   ├─ Load template (cached)
   │   ├─ Inject sensor data
   │   ├─ Generate sensor rows
   │   ├─ Create Chart.js data
   │   └─ Wrap in HTML
   │
   ├─→ PDF Generation Service
   │   ├─ Create browser page
   │   ├─ Set viewport (1200x1600, 2x scale)
   │   ├─ Load HTML content
   │   ├─ Wait for:
   │   │   ├─ DOM ready
   │   │   ├─ Network idle
   │   │   ├─ Fonts loaded
   │   │   └─ #render-complete marker
   │   ├─ Generate PDF (A4, print background)
   │   └─ Close page
   │
   ├─→ Log to Database
   │   INSERT INTO reports.generated_reports
   │
   └─→ Response
       Content-Type: application/pdf
       Content-Disposition: inline; filename=...
       Body: [PDF Buffer]

Total time: ~2-5 seconds (depending on data volume)
```

### Sensor Query Flow

```
1. Client Request
   GET /api/sensors/TEMP-A101/readings?aggregation=hourly
   │
   ├─→ Route → Controller
   │
   ├─→ iotDataService.getSensorReadings()
   │   ├─ Parse parameters (sensorId, dates, aggregation)
   │   ├─ Choose query based on aggregation:
   │   │   ├─ raw    → iot.sensor_readings
   │   │   ├─ hourly → iot.sensor_readings_hourly
   │   │   └─ daily  → iot.sensor_readings_daily
   │   ├─ Execute query with connection pool
   │   └─ Return results
   │
   └─→ Response
       {success: true, data: [...], count: N}

Query time: ~50-200ms (aggregated), 500ms-2s (raw)
```

---

## 🚀 Deployment Architecture

### Docker Compose Stack

```
┌─────────────────────────────────────────────┐
│              Docker Network (bridge)         │
│                                              │
│  ┌────────────────┐  ┌──────────────────┐  │
│  │  TimescaleDB   │  │  Report Service  │  │
│  │  :5432         │◄─┤  :3000           │  │
│  │  Volume:       │  │  Depends on DB   │  │
│  │  timescale_data│  │  Health checks   │  │
│  └────────────────┘  └──────────────────┘  │
│          ▲                                   │
│          │                                   │
│  ┌───────┴────────┐  ┌──────────────────┐  │
│  │  Ollama (opt)  │  │  pgAdmin (dev)   │  │
│  │  :11434        │  │  :5050           │  │
│  │  Profile: ai   │  │  Profile: dev    │  │
│  └────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────┘
```

### Service Dependencies

```yaml
report-service:
  depends_on:
    timescaledb:
      condition: service_healthy
```

**Startup Sequence**:
1. TimescaleDB starts
2. Initialize schemas (01-init.sql)
3. Seed sample data (02-seed.sql)
4. Health check passes
5. Report service starts
6. Connect to database
7. Initialize Puppeteer
8. Ready to accept requests

### Health Checks

**TimescaleDB**:
```bash
pg_isready -U postgres
Interval: 10s, Timeout: 5s, Retries: 5
```

**Report Service**:
```bash
wget --quiet --tries=1 --spider http://localhost:3000/health
Interval: 30s, Timeout: 10s, Retries: 3, Start period: 40s
```

---

## 🔐 Security Considerations

### 1. Input Validation
- Joi schema validation on all inputs
- SQL parameterized queries (no string concatenation)
- XML escaping in SVG templates

### 2. HTTP Security
- Helmet.js security headers
- CORS configuration
- Request rate limiting (not yet implemented)

### 3. Database Security
- Connection pooling (prevents exhaustion)
- Least privilege (separate read/write users recommended)
- No exposed credentials in code

### 4. Process Security
- Non-root user in Docker (nodejs:1001)
- Read-only file system (where possible)
- Limited Puppeteer sandbox

---

## 📊 Performance Characteristics

### Benchmarks

| Operation | Time | Notes |
|-----------|------|-------|
| Health Check | <10ms | In-memory + DB ping |
| Get All Sensors | 20-50ms | ~12 sensors |
| Get Hourly Readings (7 days) | 50-100ms | TimescaleDB aggregates |
| Get Raw Readings (1 day) | 200-500ms | ~288 rows |
| Calculate KPI | 50-150ms | Depends on complexity |
| Generate PDF Report | 2-5s | Puppeteer rendering |
| Generate HTML Report | 50-100ms | No Puppeteer |

### Optimization Opportunities

1. **Redis Caching**
   - Cache sensor metadata (TTL: 5 minutes)
   - Cache KPI results (TTL: 1 hour)
   - Cache rendered SVG (TTL: 1 hour)

2. **Report Queue**
   - BullMQ for async generation
   - Background workers
   - Progress tracking

3. **Database**
   - Partition older data to separate tablespaces
   - Implement retention policies
   - Add more continuous aggregates (weekly, monthly)

4. **Puppeteer**
   - Increase browser pool size
   - Preload common templates
   - Use lighter PDF engine (svg2pdf.js) for simple reports

---

## 🎨 SVG Template Architecture

### Template Hierarchy

```
Base Template (SVG)
├── Static Design
│   ├── Header
│   ├── Logo
│   └── Footer
├── Placeholders
│   ├── Text: {{report_title}}
│   ├── Values: {{sensor_value}}
│   └── Dates: {{generation_date}}
├── Dynamic Sections
│   ├── Sensor Rows (loop)
│   └── KPI Cards (array)
└── Chart Container
    └── foreignObject → HTML → Chart.js
```

### Data Flow

```javascript
// 1. Load template
const svgTemplate = await loadTemplate('iot-summary.svg');

// 2. Prepare data
const data = {
  report_title: "IoT Summary",
  sensor_rows: generateSensorRows(sensors),
  kpi_1_value: kpis[0].value
};

// 3. Replace placeholders
const processedSvg = replacePlaceholders(svgTemplate, data);

// 4. Wrap in HTML
const html = generateHtmlWithSvg(processedSvg, chartData);

// 5. Convert to PDF
const pdf = await generatePdfFromHtml(html);
```

---

## 🔮 Future Architecture Enhancements

### 1. Ollama Integration

```
┌────────────────────────────────────────┐
│        Natural Language Query           │
│  "Show me avg temp in Building A"     │
└──────────────┬─────────────────────────┘
               │
┌──────────────▼─────────────────────────┐
│         Ollama Service                  │
│  Model: SQLCoder / Code Llama          │
│  Prompt: Schema + Question → SQL       │
└──────────────┬─────────────────────────┘
               │
┌──────────────▼─────────────────────────┐
│      SQL Validation & Execution         │
│  • Whitelist allowed operations        │
│  • Execute with read-only user         │
│  • Return results                       │
└─────────────────────────────────────────┘
```

### 2. Microservices Split

```
API Gateway (Express)
├─→ Sensor Service (Python/FastAPI)
│   └─→ TimescaleDB
├─→ Report Service (Node.js)
│   ├─→ Template Service
│   └─→ PDF Service (Puppeteer)
├─→ KPI Service (Node.js)
│   └─→ TimescaleDB
└─→ AI Service (Python)
    └─→ Ollama
```

### 3. Event-Driven Architecture

```
IoT Devices → MQTT Broker → Message Queue
                                ↓
                         Stream Processor
                         (Apache Kafka)
                                ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
            TimescaleDB               Alert Service
                    ↓                       ↓
            Report Service            Notification
```

---

## 📚 Further Reading

- [TimescaleDB Documentation](https://docs.timescale.com/)
- [Puppeteer Best Practices](https://pptr.dev/)
- [Express.js Performance](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Node.js Design Patterns](https://www.nodejsdesignpatterns.com/)

---

**Architecture Version**: 1.0.0
**Last Updated**: 2024-11-11
**Maintained By**: TREEADS Development Team
