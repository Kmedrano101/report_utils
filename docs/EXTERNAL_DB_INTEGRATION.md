# 🔌 External Database Integration

Quick guide for integrating IoT Report Utils with your existing projects and external databases.

---

## 🎯 Overview

IoT Report Utils now supports:
- ✅ **External PostgreSQL/TimescaleDB** connections
- ✅ **Web UI** for easy configuration
- ✅ **Multiple database profiles**
- ✅ **Schema auto-detection**
- ✅ **Portable configuration files**
- ✅ **Multi-project support**

---

## ⚡ Quick Start (Web UI)

### 1. Access Web Interface

Open your browser:
```
http://localhost:3000/
```

### 2. Configure External Database

1. Click **Database Config** tab
2. Select **External Database** profile
3. Enter your database details
4. Click **Test Connection**
5. Click **Apply Configuration**
6. Restart service:
   ```bash
   docker-compose restart report-service
   ```

### 3. Generate Reports

1. Click **Reports** tab
2. Select date range
3. Choose sensors
4. Click **Generate & Download Report**

---

## 📦 Integration Methods

### Method 1: Web UI (Easiest)

**Best for:** Non-technical users, quick setup

**Steps:**
1. Open `http://localhost:3000/`
2. Use visual interface to configure
3. Test connection with one click
4. Auto-detect schema

**Pros:**
- No code required
- Visual feedback
- Connection testing built-in
- Schema auto-detection

### Method 2: Configuration File

**Best for:** DevOps, automated deployments

**Location:** `config/databases.json`

**Example:**
```json
{
  "production": {
    "host": "prod-db.example.com",
    "port": 5432,
    "database": "iot_production",
    "user": "iot_user",
    "ssl": "require",
    "poolMin": 5,
    "poolMax": 20,
    "schema": {
      "sensors": "public.sensors",
      "readings": "public.measurements",
      "sensorTypes": "public.categories"
    }
  }
}
```

**Usage:**
```bash
# Edit config file
vim config/databases.json

# Restart service
docker-compose restart report-service
```

**Pros:**
- Version control friendly
- Easy to automate
- Can be templated

### Method 3: Environment Variables

**Best for:** Docker deployments, CI/CD

**Docker Compose:**
```yaml
services:
  report-service:
    environment:
      DB_HOST: ${EXTERNAL_DB_HOST}
      DB_PORT: ${EXTERNAL_DB_PORT}
      DB_NAME: ${EXTERNAL_DB_NAME}
      DB_USER: ${EXTERNAL_DB_USER}
      DB_PASSWORD: ${EXTERNAL_DB_PASSWORD}
```

**.env file:**
```env
EXTERNAL_DB_HOST=your-db-server.com
EXTERNAL_DB_PORT=5432
EXTERNAL_DB_NAME=your_database
EXTERNAL_DB_USER=your_user
EXTERNAL_DB_PASSWORD=your_password
```

**Pros:**
- Secure (no passwords in config files)
- Environment-specific
- 12-factor app compliant

### Method 4: API Programmatic

**Best for:** Integration scripts, automation

**Test Connection:**
```bash
curl -X POST http://localhost:3000/api/config/test-connection \
  -H "Content-Type: application/json" \
  -d '{
    "host": "your-db.com",
    "port": 5432,
    "database": "your_db",
    "user": "user",
    "password": "pass"
  }'
```

**Save Configuration:**
```bash
curl -X POST http://localhost:3000/api/config/database \
  -H "Content-Type: application/json" \
  -d @database-config.json
```

**Pros:**
- Scriptable
- Can be automated
- Integrates with existing tools

---

## 🏢 Use Cases

### Use Case 1: Single External Database

**Scenario:** Replace built-in database with your own

**Solution:**
```bash
# Web UI Method
1. Open http://localhost:3000/
2. Database Config tab
3. Enter connection details
4. Test & Apply
5. Restart service
```

**Environment Method:**
```bash
# .env file
DB_HOST=my-timescaledb.internal.company.com
DB_NAME=iot_data
DB_USER=reports_readonly
```

### Use Case 2: Multiple Projects

**Scenario:** Generate reports for different projects from different databases

**Solution:** Run multiple instances

```yaml
# docker-compose.yml
services:
  reports-project-a:
    image: iot-report-utils
    ports: ["3001:3000"]
    environment:
      DB_HOST: project-a-db.com
      DB_NAME: project_a

  reports-project-b:
    image: iot-report-utils
    ports: ["3002:3000"]
    environment:
      DB_HOST: project-b-db.com
      DB_NAME: project_b
```

**Access:**
- Project A: `http://localhost:3001/`
- Project B: `http://localhost:3002/`

### Use Case 3: Embedded in Existing System

**Scenario:** Add reporting to existing IoT platform

**Solution:** Docker Compose Integration

```yaml
# Your existing docker-compose.yml
services:
  your-iot-app:
    ...

  your-database:
    ...

  # Add reporting service
  iot-reports:
    image: iot-report-utils
    ports: ["3000:3000"]
    environment:
      DB_HOST: your-database
      DB_NAME: your_iot_db
      DB_USER: reports_user
      DB_PASSWORD: ${REPORTS_PASSWORD}
    depends_on:
      - your-database
    networks:
      - your-network
```

### Use Case 4: Read-Only Access

**Scenario:** Grant reporting without write permissions

**Solution:** Create read-only user

```sql
-- Create user
CREATE USER report_viewer WITH PASSWORD 'secure_password';

-- Grant permissions
GRANT CONNECT ON DATABASE iot_database TO report_viewer;
GRANT USAGE ON SCHEMA iot TO report_viewer;
GRANT SELECT ON ALL TABLES IN SCHEMA iot TO report_viewer;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA iot TO report_viewer;

-- For TimescaleDB continuous aggregates
GRANT SELECT ON ALL TABLES IN SCHEMA _timescaledb_internal TO report_viewer;
```

**Configure:**
```bash
# Use read-only user
DB_USER=report_viewer
DB_PASSWORD=secure_password
```

---

## 🗄️ Database Schema Requirements

### Minimum Required Tables

Your database needs tables for:

1. **Sensors/Devices**
   - Sensor metadata (name, type, location)
   - Must have: `id`, `sensor_code`, `name`, `sensor_type`

2. **Readings/Measurements**
   - Time-series data
   - Must have: `time`, `sensor_id`, `value`

3. **Sensor Types** (optional)
   - Sensor categories
   - Must have: `id`, `name`, `unit`

### Compatible Schema Patterns

**Pattern 1: Default Schema** (Best compatibility)
```sql
CREATE TABLE sensors (
    id SERIAL PRIMARY KEY,
    sensor_code VARCHAR UNIQUE,
    name VARCHAR,
    sensor_type VARCHAR,
    location VARCHAR,
    is_active BOOLEAN
);

CREATE TABLE sensor_readings (
    time TIMESTAMPTZ NOT NULL,
    sensor_id INTEGER REFERENCES sensors(id),
    value NUMERIC,
    PRIMARY KEY (time, sensor_id)
);
```

**Pattern 2: Custom Schema** (With mapping)
```sql
-- Your existing tables
CREATE TABLE devices (...);
CREATE TABLE measurements (...);
CREATE TABLE device_types (...);
```

**Map in Web UI:**
```
Sensors Table: public.devices
Readings Table: public.measurements
Sensor Types: public.device_types
```

### TimescaleDB Optimization

For best performance:

```sql
-- Convert to hypertable
SELECT create_hypertable('sensor_readings', 'time');

-- Create continuous aggregates
CREATE MATERIALIZED VIEW sensor_readings_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    sensor_id,
    AVG(value) AS avg_value,
    MIN(value) AS min_value,
    MAX(value) AS max_value
FROM sensor_readings
GROUP BY bucket, sensor_id;
```

---

## 🔒 Security Considerations

### 1. Use Read-Only Access

Create dedicated user with SELECT only:
```sql
GRANT SELECT ON ALL TABLES IN SCHEMA iot TO report_viewer;
```

### 2. Enable SSL

```
SSL Mode: require
```

Or in environment:
```env
DB_SSL=require
```

### 3. Network Isolation

Use Docker networks:
```yaml
networks:
  iot-network:
    internal: true  # No external access
```

### 4. Secrets Management

**Don't:**
- ❌ Commit passwords to Git
- ❌ Store passwords in config files
- ❌ Use default passwords

**Do:**
- ✅ Use environment variables
- ✅ Use Docker secrets
- ✅ Use vault systems (HashiCorp Vault, AWS Secrets Manager)

---

## 🚀 Deployment Examples

### Example 1: Kubernetes

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
data:
  password: <base64-encoded>

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iot-reports
spec:
  template:
    spec:
      containers:
      - name: report-service
        image: iot-report-utils:latest
        env:
        - name: DB_HOST
          value: "postgres.default.svc.cluster.local"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
```

### Example 2: Docker Swarm

```yaml
version: '3.8'
services:
  report-service:
    image: iot-report-utils
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
    secrets:
      - db_password
    environment:
      DB_HOST: postgres-cluster
      DB_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    external: true
```

### Example 3: systemd Service

```ini
[Unit]
Description=IoT Report Utils
After=network.target postgresql.service

[Service]
Type=simple
User=iot-reports
EnvironmentFile=/etc/iot-reports/config.env
ExecStart=/usr/local/bin/iot-reports
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

---

## 📊 Performance Tuning

### Connection Pooling

```json
{
  "poolMin": 5,     // Always maintain 5 connections
  "poolMax": 20     // Scale up to 20 under load
}
```

**Guidelines:**
- Low traffic: Min=2, Max=10
- Medium traffic: Min=5, Max=20
- High traffic: Min=10, Max=50

### Query Optimization

1. **Create Indexes**
```sql
CREATE INDEX idx_readings_time ON sensor_readings(time DESC);
CREATE INDEX idx_readings_sensor ON sensor_readings(sensor_id, time DESC);
```

2. **Use Continuous Aggregates**
```sql
-- Pre-compute hourly stats
CREATE MATERIALIZED VIEW sensor_readings_hourly ...
```

3. **Partition Large Tables**
```sql
-- Partition by month
SELECT create_hypertable('sensor_readings', 'time', chunk_time_interval => INTERVAL '1 month');
```

---

## 🧪 Testing

### Test Connection

**Web UI:**
1. Database Config tab
2. Click "Test Connection"
3. Check for green success message

**API:**
```bash
curl -X POST http://localhost:3000/api/config/test-connection \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost",
    "port": 5432,
    "database": "test_db",
    "user": "test_user",
    "password": "test_pass"
  }'
```

### Test Schema Detection

**Web UI:**
1. Click "Auto-Detect Schema"
2. Review detected tables
3. Verify mappings

**API:**
```bash
curl -X POST http://localhost:3000/api/config/detect-schema \
  -H "Content-Type: application/json" \
  -d '{ "host": "localhost", ... }'
```

### Test Report Generation

```bash
curl -X POST http://localhost:3000/api/reports/iot-summary \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-11-01",
    "endDate": "2024-11-11",
    "format": "pdf"
  }' \
  --output test-external-db-report.pdf
```

---

## 🐛 Troubleshooting

### Issue: Connection Timeout

**Symptoms:** "Connection timed out" error

**Solutions:**
1. Check firewall rules
2. Verify database is accessible:
   ```bash
   telnet db-host 5432
   ```
3. Check PostgreSQL `listen_addresses`:
   ```
   listen_addresses = '*'
   ```
4. Increase timeout:
   ```env
   DB_CONNECTION_TIMEOUT=10000
   ```

### Issue: Permission Denied

**Symptoms:** "permission denied for table"

**Solutions:**
1. Grant SELECT permissions:
   ```sql
   GRANT SELECT ON ALL TABLES IN SCHEMA iot TO your_user;
   ```
2. Check pg_hba.conf:
   ```
   host  all  all  0.0.0.0/0  md5
   ```

### Issue: Schema Not Found

**Symptoms:** "relation does not exist"

**Solutions:**
1. Verify table names:
   ```sql
   \dt iot.*
   ```
2. Update schema mapping in Web UI
3. Check search_path:
   ```sql
   SHOW search_path;
   ```

---

## 📚 Additional Resources

- **Web UI Guide:** [WEB_UI_GUIDE.md](WEB_UI_GUIDE.md)
- **API Documentation:** [API_EXAMPLES.md](API_EXAMPLES.md)
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Main README:** [README.md](../README.md)

---

## ✅ Checklist

Before going to production:

- [ ] Database connection tested
- [ ] Read-only user created
- [ ] SSL enabled for production
- [ ] Connection pooling configured
- [ ] Schema mapping verified
- [ ] Test report generated successfully
- [ ] Backup configuration files
- [ ] Passwords stored securely
- [ ] Monitoring setup
- [ ] Documentation updated

---

**Ready to integrate? Start with the [Web UI](http://localhost:3000/)!** 🚀
