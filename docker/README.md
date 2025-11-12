# Madison IoT External Database

Docker-based TimescaleDB setup for Madison IoT data with automatic data import from Excel.

## Overview

This setup provides:
- **TimescaleDB**: PostgreSQL with time-series optimization
- **PgAdmin**: Web-based database management
- **Automated Import**: Excel data automatically imported into database
- **~353,000 rows** of real IoT sensor data

## Architecture

```
┌─────────────────────────────────────────────┐
│   datos_iot_madison.xlsx (8.9 MB)          │
│   11 sheets × ~353K rows                    │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│   Data Importer Container (Python)         │
│   - Reads Excel file                        │
│   - Parses sensor data                      │
│   - Bulk inserts into TimescaleDB          │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│   TimescaleDB (PostgreSQL + Extension)     │
│   - Time-series optimized hypertables      │
│   - Automatic data retention               │
│   - Continuous aggregates (hourly)         │
│   - Custom functions for analysis          │
└─────────────────┬───────────────────────────┘
                  │
                  ├──────────► PgAdmin (localhost:5050)
                  │
                  └──────────► Application (localhost:3000)
```

## Data Structure

### Sensors (11 total)

| Type | Sensors | Readings | Frequency | Metrics |
|------|---------|----------|-----------|---------|
| **Current** | c1 | 299,025 | 10 sec | 4× Current clamps (A), Battery |
| **Environmental** | s1-s5 | 27,555 | 10 min | Temperature, Humidity, Light, Noise, Movement, Battery |
| **Temperature** | t1-t5 | 27,471 | 10 min | Temperature, Humidity, Battery |

**Total: ~353,000 readings**

### Database Schema

```sql
iot.sensors                      -- Sensor metadata (11 sensors)
iot.current_readings             -- High-frequency current data (299K rows)
iot.environmental_readings       -- Environmental sensors (27K rows)
iot.temperature_readings         -- Temperature sensors (27K rows)

-- Continuous Aggregates (auto-updated hourly)
iot.current_readings_hourly
iot.environmental_readings_hourly
iot.temperature_readings_hourly

-- Views
iot.latest_readings              -- Latest reading from each sensor

-- Functions
iot.get_sensor_statistics(code, start, end)  -- Get stats for time range
```

## Quick Start

### 1. Start the Database

```bash
cd docker
chmod +x start.sh query.sh
./start.sh
```

This will:
1. Start TimescaleDB and PgAdmin containers
2. Initialize database schema
3. Import all Excel data (~5-10 minutes)

### 2. Access Services

**TimescaleDB:**
- Host: `localhost:5432`
- Database: `madison_iot`
- User: `postgres`
- Password: `postgres`

**PgAdmin:**
- URL: http://localhost:5050
- Email: `admin@madison.local`
- Password: `admin`

### 3. Test Connection

```bash
# Run sample queries
./query.sh

# Or connect directly
docker exec -it madison_iot_db psql -U postgres -d madison_iot
```

## Sample Queries

### 1. Get all sensors
```sql
SELECT * FROM iot.sensors ORDER BY sensor_code;
```

### 2. Latest readings from all sensors
```sql
SELECT * FROM iot.latest_readings;
```

### 3. Temperature statistics for sensor t1
```sql
SELECT
    COUNT(*) as total_readings,
    ROUND(AVG(temperature_c), 2) as avg_temp,
    ROUND(MIN(temperature_c), 2) as min_temp,
    ROUND(MAX(temperature_c), 2) as max_temp
FROM iot.temperature_readings
WHERE sensor_id = (SELECT sensor_id FROM iot.sensors WHERE sensor_code = 't1');
```

### 4. Hourly averages for current sensor (last 24 hours)
```sql
SELECT
    bucket,
    ROUND(avg_clamp_1_a::numeric, 4) as avg_current_a,
    ROUND(max_clamp_1_a::numeric, 4) as max_current_a,
    reading_count
FROM iot.current_readings_hourly
WHERE sensor_id = (SELECT sensor_id FROM iot.sensors WHERE sensor_code = 'c1')
  AND bucket > NOW() - INTERVAL '24 hours'
ORDER BY bucket DESC;
```

### 5. Get statistics using custom function
```sql
SELECT iot.get_sensor_statistics(
    's1',
    '2025-10-01 00:00:00'::timestamptz,
    '2025-10-31 23:59:59'::timestamptz
);
```

## Data Import Details

### Import Process

1. **Schema Creation** (`init.sql`):
   - Creates `iot` schema
   - Creates sensors table and inserts 11 sensors
   - Creates 3 readings tables (current, environmental, temperature)
   - Converts to TimescaleDB hypertables
   - Creates continuous aggregates
   - Creates helper views and functions

2. **Data Import** (`import_data.py`):
   - Reads all 11 sheets from Excel file
   - Parses timestamps and sensor values
   - Batch inserts data (5000 rows per batch)
   - Maps sensor codes to database IDs
   - Shows progress during import

### Import Performance

- **Batch Size**: 5,000 rows per insert
- **Expected Duration**: 5-10 minutes
- **Throughput**: ~600-1,000 rows/second
- **Total Data**: ~353,000 rows

### Re-import Data

To re-import data:

```bash
# Stop containers
docker-compose down

# Remove data volume
docker volume rm madison_iot_db_data

# Start fresh
./start.sh
```

Or truncate tables and re-run importer:

```bash
docker exec madison_iot_db psql -U postgres -d madison_iot \
  -c "TRUNCATE iot.current_readings, iot.environmental_readings, iot.temperature_readings;"

docker-compose up data_importer
```

## Integration with Application

### Update Application Configuration

Create `.env.external` file:

```bash
# External TimescaleDB
EXTERNAL_DB_HOST=localhost
EXTERNAL_DB_PORT=5432
EXTERNAL_DB_NAME=madison_iot
EXTERNAL_DB_USER=postgres
EXTERNAL_DB_PASSWORD=postgres
```

### Update Database Connection

Modify `src/config/database.js`:

```javascript
const externalPool = new Pool({
  host: process.env.EXTERNAL_DB_HOST || 'localhost',
  port: process.env.EXTERNAL_DB_PORT || 5432,
  database: process.env.EXTERNAL_DB_NAME || 'madison_iot',
  user: process.env.EXTERNAL_DB_USER || 'postgres',
  password: process.env.EXTERNAL_DB_PASSWORD || 'postgres'
});

// Use iot schema for queries
externalPool.query('SET search_path TO iot, public');
```

### Query Examples for Application

```javascript
// Get all sensors
const sensors = await externalPool.query(`
  SELECT * FROM sensors WHERE is_active = true
`);

// Get latest readings
const readings = await externalPool.query(`
  SELECT * FROM latest_readings
`);

// Get sensor statistics
const stats = await externalPool.query(`
  SELECT get_sensor_statistics($1, $2, $3)
`, [sensorCode, startDate, endDate]);

// Get hourly aggregates
const hourly = await externalPool.query(`
  SELECT * FROM environmental_readings_hourly
  WHERE sensor_id = $1
    AND bucket BETWEEN $2 AND $3
  ORDER BY bucket ASC
`, [sensorId, startDate, endDate]);
```

## Management Commands

### Container Management

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f timescaledb
docker-compose logs -f data_importer

# Restart database
docker-compose restart timescaledb

# Check status
docker-compose ps
```

### Database Management

```bash
# Connect to database
docker exec -it madison_iot_db psql -U postgres -d madison_iot

# Run SQL file
docker exec -i madison_iot_db psql -U postgres -d madison_iot < query.sql

# Backup database
docker exec madison_iot_db pg_dump -U postgres madison_iot > backup.sql

# Restore database
docker exec -i madison_iot_db psql -U postgres madison_iot < backup.sql

# Check database size
docker exec madison_iot_db psql -U postgres -d madison_iot \
  -c "SELECT pg_size_pretty(pg_database_size('madison_iot'));"
```

### Data Analysis

```bash
# Run sample queries
./query.sh

# Check data counts
docker exec madison_iot_db psql -U postgres -d madison_iot -c "
  SELECT
    (SELECT COUNT(*) FROM iot.current_readings) as current_readings,
    (SELECT COUNT(*) FROM iot.environmental_readings) as environmental_readings,
    (SELECT COUNT(*) FROM iot.temperature_readings) as temperature_readings;
"

# Check time range
docker exec madison_iot_db psql -U postgres -d madison_iot -c "
  SELECT MIN(time) as earliest, MAX(time) as latest
  FROM iot.current_readings;
"
```

## Troubleshooting

### Port Already in Use

If port 5432 is already in use:

1. Edit `docker-compose.yml`
2. Change `5432:5432` to `5433:5432`
3. Update application config to use port 5433

### Import Fails

Check logs:
```bash
docker-compose logs data_importer
```

Common issues:
- Excel file path incorrect
- Database not ready (wait longer)
- Memory issues (reduce batch size)

### Database Connection Issues

```bash
# Check if container is running
docker ps | grep madison_iot_db

# Check database logs
docker-compose logs timescaledb

# Test connection
docker exec madison_iot_db pg_isready -U postgres -d madison_iot
```

### Performance Issues

If queries are slow:

```sql
-- Refresh continuous aggregates manually
CALL refresh_continuous_aggregate('iot.current_readings_hourly', NULL, NULL);
CALL refresh_continuous_aggregate('iot.environmental_readings_hourly', NULL, NULL);
CALL refresh_continuous_aggregate('iot.temperature_readings_hourly', NULL, NULL);

-- Analyze tables
ANALYZE iot.current_readings;
ANALYZE iot.environmental_readings;
ANALYZE iot.temperature_readings;

-- Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'iot'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## TimescaleDB Features

### Hypertables

Automatic partitioning by time:
- `current_readings`: 1-day chunks
- `environmental_readings`: 7-day chunks
- `temperature_readings`: 7-day chunks

### Continuous Aggregates

Pre-computed hourly rollups:
- Updated automatically every hour
- Much faster than querying raw data
- Includes: averages, min/max, counts

### Compression (Optional)

Enable compression for older data:

```sql
ALTER TABLE iot.current_readings SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'sensor_id'
);

SELECT add_compression_policy('iot.current_readings', INTERVAL '7 days');
```

### Retention Policies (Optional)

Automatically delete old data:

```sql
SELECT add_retention_policy('iot.current_readings', INTERVAL '90 days');
```

## Files

```
docker/
├── docker-compose.yml          # Container orchestration
├── start.sh                    # Startup script
├── query.sh                    # Sample queries
├── README.md                   # This file
├── db/
│   ├── init.sql               # Database schema
│   └── import_data.py         # Data import script
└── pgadmin/
    └── servers.json           # PgAdmin configuration
```

## Resources

- **TimescaleDB**: https://docs.timescale.com/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **PgAdmin**: https://www.pgadmin.org/docs/

## Support

For issues:
1. Check logs: `docker-compose logs`
2. Verify Excel file exists
3. Check disk space: `docker system df`
4. Test connection: `./query.sh`

---

**Madison IoT Project** | External Database Setup
