# 🖥️ Web UI Configuration Guide

Complete guide for using the IoT Report Utils web interface to configure external databases and manage reports.

---

## 🌐 Accessing the Web UI

Open your browser and navigate to:

```
http://localhost:3000/
```

The Web UI provides a user-friendly interface for:
- 📊 System monitoring and health checks
- 🗄️ Database configuration
- 📄 Report generation
- 🔌 API testing

---

## 📑 Dashboard Tab

### System Overview

The dashboard provides real-time information about:

**System Health Card**
- Online/offline status
- Server uptime
- Memory usage

**Database Card**
- Connection status
- Connection pool usage (idle/total)
- Database type (TimescaleDB detected automatically)

**Reports Card**
- Number of generated reports
- Available templates
- PDF engine status (Chrome version)

### Sensors Overview

Displays up to 6 sensors with:
- Current readings
- Sensor type and unit
- Location information
- Active status indicator (green = active, red = inactive)

### Quick Actions

Three quick action buttons:
- **Generate Report** - Jump to report generation
- **Configure Database** - Set up external database
- **API Explorer** - Test API endpoints

---

## 🗄️ Database Configuration Tab

### Connection Profiles

Select from predefined profiles:
- **Default (Built-in)** - Use the internal TimescaleDB
- **External Database** - Connect to external PostgreSQL/TimescaleDB
- **Custom Configuration** - Manual configuration

### Database Settings

Configure your external database:

| Field | Description | Example |
|-------|-------------|---------|
| **Host** | Database server hostname or IP | `192.168.1.100` |
| **Port** | PostgreSQL port | `5432` |
| **Database Name** | Target database | `my_iot_database` |
| **Username** | Database user | `iot_user` |
| **Password** | User password | `••••••••` |
| **SSL Mode** | SSL connection mode | `disable`, `prefer`, `require` |
| **Pool Min** | Minimum connections | `2` |
| **Pool Max** | Maximum connections | `10` |

### Actions

**Test Connection**
- Validates database credentials
- Checks TimescaleDB extension
- Returns database version and time
- Shows green success or red error message

**Apply Configuration**
- Saves configuration to file
- Configuration persists across restarts
- Requires service restart to take effect

**Save Profile**
- Saves configuration to `config/databases.json`
- Can be exported/imported
- Password not saved to file for security

### Schema Mapping

Map your existing database schema to IoT Report Utils:

| Table | Description | Default |
|-------|-------------|---------|
| **Sensors Table** | Contains sensor metadata | `iot.sensors` |
| **Readings Table** | Time-series sensor data | `iot.sensor_readings` |
| **Sensor Types** | Sensor type definitions | `iot.sensor_types` |

**Auto-Detect Schema**
- Scans your database for tables
- Attempts to identify sensor-related tables
- Suggests table mappings
- Lists all available tables

---

## 📄 Reports Tab

### Generate Report

**Report Configuration:**

1. **Report Type**
   - IoT Summary Report - Overview of all sensors
   - Sensor Detailed Report - Individual sensor analysis
   - Building Report - All sensors in a building

2. **Output Format**
   - PDF - Download as PDF file
   - HTML - Open in new browser window

3. **Date Range**
   - Start Date - Beginning of data range
   - End Date - End of data range

4. **Sensor Selection** (Optional)
   - Check individual sensors to include
   - Leave unchecked to include all sensors

**Generate & Download**
- Click button to start generation
- Progress spinner appears during generation
- PDF downloads automatically
- HTML opens in new window

### Recent Reports

Shows last 10 generated reports with:
- Report name and type
- Generation timestamp
- File size in KB
- Generation time in milliseconds

---

## 🔌 API Explorer Tab

Interactive API testing interface.

### Endpoint Selection

Choose from common endpoints:
- `GET /health` - Health Check
- `GET /api/sensors` - List Sensors
- `GET /api/kpis` - List KPIs
- `GET /api/reports/templates` - List Templates

### cURL Command

Automatically generated cURL command for the selected endpoint.

**Copy Button**
- Click to copy cURL command to clipboard
- Use in terminal for testing
- Share with team members

### Test Endpoint

Click "Test Endpoint" to:
- Execute API call directly from browser
- View formatted JSON response
- Check API availability

---

## 🔧 External Database Integration

### Step-by-Step Setup

#### 1. Prepare Your Database

Your existing database should have:
- PostgreSQL 12+ (preferably with TimescaleDB)
- Tables with sensor metadata
- Tables with time-series readings
- Proper permissions for the user

#### 2. Configure Connection

1. Open Web UI: `http://localhost:3000/`
2. Click **Database Config** tab
3. Select **External Database** profile
4. Enter connection details:
   ```
   Host: your-database-host.com
   Port: 5432
   Database: your_database_name
   Username: your_username
   Password: your_password
   ```

#### 3. Test Connection

1. Click **Test Connection**
2. Wait for validation
3. Check for success message
4. Review database version information

#### 4. Map Schema

If your schema differs from default:

1. Click **Auto-Detect Schema** to scan
2. Or manually enter table names:
   ```
   Sensors Table: public.devices
   Readings Table: public.sensor_data
   Sensor Types: public.device_types
   ```

#### 5. Apply & Restart

1. Click **Apply Configuration**
2. Restart the service:
   ```bash
   docker-compose restart report-service
   ```
3. Verify connection on dashboard

---

## 📦 Configuration Files

### Location

Configurations are saved to:
```
/home/kmedrano/src/report_utils/config/databases.json
```

### Format

```json
{
  "production": {
    "host": "prod-db.example.com",
    "port": 5432,
    "database": "iot_production",
    "user": "iot_prod_user",
    "ssl": "require",
    "poolMin": 5,
    "poolMax": 20,
    "schema": {
      "sensors": "public.sensors",
      "readings": "public.measurements",
      "sensorTypes": "public.sensor_categories"
    },
    "createdAt": "2024-11-11T10:00:00.000Z",
    "updatedAt": "2024-11-11T10:00:00.000Z"
  },
  "staging": {
    ...
  }
}
```

### Security Notes

⚠️ **Important:**
- Passwords are NOT saved to the configuration file
- Store passwords in environment variables
- Use `.env` file for sensitive credentials
- Never commit `databases.json` with passwords to version control

---

## 🔄 Using Multiple Databases

### Scenario: Different Databases for Different Projects

1. **Project A Database**
   ```bash
   # Save as "project-a"
   Host: project-a-db.com
   Database: project_a_iot
   ```

2. **Project B Database**
   ```bash
   # Save as "project-b"
   Host: project-b-db.com
   Database: project_b_sensors
   ```

3. **Switch Between Projects**
   - Use environment variables
   - Or restart with different config name
   - Or use Docker Compose profiles

### Docker Compose Example

```yaml
# Multiple service instances
services:
  report-service-a:
    image: iot-report-utils
    environment:
      DB_HOST: project-a-db.com
      DB_NAME: project_a_iot
    ports:
      - "3001:3000"

  report-service-b:
    image: iot-report-utils
    environment:
      DB_HOST: project-b-db.com
      DB_NAME: project_b_sensors
    ports:
      - "3002:3000"
```

---

## 🚀 Integration Examples

### Example 1: Integrate with Existing IoT Platform

Your current setup:
```
PostgreSQL Database
├── sensors_metadata (table)
├── time_series_data (hypertable)
└── device_types (table)
```

Configuration:
```
Sensors Table: public.sensors_metadata
Readings Table: public.time_series_data
Sensor Types: public.device_types
```

### Example 2: Multi-Tenant Setup

Different databases for each tenant:

```bash
# Tenant 1
docker-compose up -d report-service-tenant1
# Access: http://localhost:3001/

# Tenant 2
docker-compose up -d report-service-tenant2
# Access: http://localhost:3002/
```

### Example 3: Read-Only Access

Grant read-only permissions:

```sql
-- Create read-only user
CREATE USER report_viewer WITH PASSWORD 'secure_password';

-- Grant permissions
GRANT CONNECT ON DATABASE iot_database TO report_viewer;
GRANT USAGE ON SCHEMA iot TO report_viewer;
GRANT SELECT ON ALL TABLES IN SCHEMA iot TO report_viewer;
GRANT SELECT ON ALL TABLES IN SCHEMA reports TO report_viewer;
```

Use in configuration:
```
Username: report_viewer
Password: secure_password
```

---

## 🛠️ Troubleshooting

### Connection Failed

**Problem:** "Connection failed" error

**Solutions:**
1. Check host and port are correct
2. Verify firewall allows connection
3. Test with psql:
   ```bash
   psql -h hostname -p 5432 -U username -d database
   ```
4. Check PostgreSQL `pg_hba.conf` allows connections

### Schema Not Detected

**Problem:** Auto-detect doesn't find tables

**Solutions:**
1. Manually enter table names
2. Check schema permissions
3. Verify tables exist:
   ```sql
   SELECT schemaname, tablename
   FROM pg_tables
   WHERE schemaname = 'iot';
   ```

### Reports Show No Data

**Problem:** Generated reports are empty

**Solutions:**
1. Verify schema mapping is correct
2. Check data exists in date range
3. Test query manually:
   ```sql
   SELECT * FROM iot.sensor_readings LIMIT 10;
   ```
4. Check column names match expected schema

---

## 📝 API Configuration Endpoints

For programmatic configuration:

### Test Connection
```bash
curl -X POST http://localhost:3000/api/config/test-connection \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost",
    "port": 5432,
    "database": "iot_reports",
    "user": "postgres",
    "password": "postgres"
  }'
```

### Save Configuration
```bash
curl -X POST http://localhost:3000/api/config/database \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production",
    "host": "prod-db.com",
    "port": 5432,
    "database": "iot_prod",
    "user": "iot_user",
    "password": "secure_pass"
  }'
```

### Auto-Detect Schema
```bash
curl -X POST http://localhost:3000/api/config/detect-schema \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost",
    "port": 5432,
    "database": "iot_reports",
    "user": "postgres",
    "password": "postgres"
  }'
```

---

## 🎯 Best Practices

1. **Security**
   - Use SSL for production databases
   - Create dedicated read-only users
   - Don't expose passwords in configs
   - Use environment variables

2. **Performance**
   - Set appropriate connection pool sizes
   - Use TimescaleDB for time-series data
   - Create indexes on frequently queried columns
   - Use continuous aggregates

3. **Reliability**
   - Test connection before applying
   - Keep backup of configuration files
   - Document schema mappings
   - Monitor connection pool usage

4. **Scalability**
   - Use connection pooling
   - Deploy multiple instances for different projects
   - Consider read replicas for reporting

---

## 📚 Next Steps

- ✅ Configure external database
- ✅ Test connection and schema
- ✅ Generate first report with external data
- 📖 Read [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- 📖 Check [API_EXAMPLES.md](API_EXAMPLES.md) for API integration

---

**For additional help, check the main [README.md](../README.md)**
