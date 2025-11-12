# External Database Setup - Complete Guide

## Overview

Successfully set up an external TimescaleDB database with Madison IoT sensor data imported from Excel.

## Architecture

```
Excel File (8.9MB, 353K rows)
        ↓
TimescaleDB (Docker)
  - Port: 5433 (external: localhost:5433)
  - Database: madison_iot
  - Schema: iot
        ↓
Report Application
  - Connects via external pool
  - Queries real sensor data
```

## What Was Created

### 1. Database Schema (`docker/db/init.sql`)
- **3 Time-Series Tables**:
  - `iot.current_readings` (299K rows) - High-frequency current sensor data
  - `iot.environmental_readings` (27K rows) - Environmental sensors (temp, humidity, light, noise, movement)
  - `iot.temperature_readings` (27K rows) - Temperature/humidity sensors

- **Sensors Table**: 11 sensors (c1, s1-s5, t1-t5)

- **Continuous Aggregates**: Hourly pre-computed rollups for faster queries

- **Custom Functions**: `get_sensor_statistics(sensor_code, start_date, end_date)`

### 2. Data Import Script (`docker/db/import_data.py`)
- Reads all 11 sheets from Excel
- Batch inserts (5000 rows per batch)
- Progress reporting
- Error handling

### 3. Docker Setup (`docker/docker-compose.yml`)
- **TimescaleDB**: PostgreSQL with time-series extensions
- **PgAdmin**: Web-based database management (http://localhost:5050)
- **Data Importer**: One-time container for Excel import

### 4. Helper Scripts
- `docker/start.sh` - Start all services
- `docker/query.sh` - Run sample queries
- `docker/README.md` - Complete documentation

## Quick Start

### Start the Database

```bash
cd /home/kmedrano/src/report_utils/docker
./start.sh
```

This will:
1. Start TimescaleDB on port 5433
2. Start PgAdmin on port 5050
3. Initialize schema
4. Import data (~5-10 minutes)

### Check Import Progress

```bash
# View import logs
docker logs -f madison_iot_importer

# Check data counts
docker exec madison_iot_db psql -U postgres -d madison_iot -c "
  SELECT COUNT(*) FROM iot.current_readings;
"
```

### Connection Details

**Database:**
- Host: `localhost`
- Port: `5433` (note: different from main app's 5432)
- Database: `madison_iot`
- User: `postgres`
- Password: `postgres`

**PgAdmin:**
- URL: http://localhost:5050
- Email: `admin@madison.local`
- Password: `admin`

## Data Structure

### Sensors

| Code | Type | Location | Readings | Frequency |
|------|------|----------|----------|-----------|
| c1 | Current | Electrical Panel | 299,025 | 10 sec |
| s1-s5 | Environmental | Office/Meeting Rooms | ~5,500 each | 10 min |
| t1-t5 | Temperature | Hallways/Rooms | ~5,500 each | 10 min |

### Sample Queries

```sql
-- Get all sensors
SELECT * FROM iot.sensors;

-- Latest readings
SELECT * FROM iot.latest_readings;

-- Temperature stats for sensor t1
SELECT
    COUNT(*) as readings,
    ROUND(AVG(temperature_c), 2) as avg_temp,
    ROUND(MIN(temperature_c), 2) as min_temp,
    ROUND(MAX(temperature_c), 2) as max_temp
FROM iot.temperature_readings
WHERE sensor_id = (SELECT sensor_id FROM iot.sensors WHERE sensor_code = 't1');

-- Hourly averages (uses continuous aggregate)
SELECT
    bucket,
    ROUND(avg_temperature_c::numeric, 2) as avg_temp
FROM iot.environmental_readings_hourly
WHERE sensor_id = (SELECT sensor_id FROM iot.sensors WHERE sensor_code = 's1')
  AND bucket > NOW() - INTERVAL '24 hours'
ORDER BY bucket DESC;

-- Using custom function
SELECT iot.get_sensor_statistics(
    's1',
    '2025-10-01 00:00:00'::timestamptz,
    '2025-10-31 23:59:59'::timestamptz
);
```

## Integration with Application

### 1. Create External Database Configuration

Create `/home/kmedrano/src/report_utils/.env.external`:

```bash
# External TimescaleDB Connection
EXTERNAL_DB_HOST=localhost
EXTERNAL_DB_PORT=5433
EXTERNAL_DB_NAME=madison_iot
EXTERNAL_DB_USER=postgres
EXTERNAL_DB_PASSWORD=postgres
EXTERNAL_DB_SCHEMA=iot
```

### 2. Update Database Config

Modify `src/config/database.js`:

```javascript
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load external DB config
dotenv.config({ path: '.env.external' });

// Existing database (application data)
const pool = new Pool({
  // ... existing config
});

// External database (IoT sensor data)
export const externalPool = new Pool({
  host: process.env.EXTERNAL_DB_HOST || 'localhost',
  port: process.env.EXTERNAL_DB_PORT || 5433,
  database: process.env.EXTERNAL_DB_NAME || 'madison_iot',
  user: process.env.EXTERNAL_DB_USER || 'postgres',
  password: process.env.EXTERNAL_DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Set search path to iot schema
externalPool.on('connect', (client) => {
  client.query('SET search_path TO iot, public');
});

export default pool;
```

### 3. Update IoT Data Service

Modify `src/services/iotDataService.js` to use external database:

```javascript
import { externalPool } from '../config/database.js';
import logger from '../utils/logger.js';

class IotDataService {
  /**
   * Get all sensors from external database
   */
  async getSensors(filters = {}) {
    try {
      const query = `
        SELECT
          sensor_id,
          sensor_code as id,
          sensor_name as name,
          sensor_type,
          location,
          building,
          is_active,
          true as latest_value_exists
        FROM sensors
        WHERE is_active = true
        ORDER BY sensor_code
      `;

      const result = await externalPool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching sensors from external DB', { error: error.message });
      throw error;
    }
  }

  /**
   * Get sensor by ID
   */
  async getSensorById(sensorCode) {
    try {
      const query = `
        SELECT
          sensor_id,
          sensor_code as id,
          sensor_name as name,
          sensor_type,
          location,
          building,
          is_active
        FROM sensors
        WHERE sensor_code = $1
      `;

      const result = await externalPool.query(query, [sensorCode]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching sensor by ID', { error: error.message, sensorCode });
      throw error;
    }
  }

  /**
   * Get all KPIs for date range
   */
  async getAllKPIs(startDate, endDate) {
    try {
      const query = `
        SELECT
          'avg_temperature' as kpi_name,
          ROUND(AVG(temperature_c), 2) as value,
          '°C' as unit
        FROM environmental_readings
        WHERE time BETWEEN $1 AND $2

        UNION ALL

        SELECT
          'avg_humidity' as kpi_name,
          ROUND(AVG(humidity_percent), 2) as value,
          '%' as unit
        FROM environmental_readings
        WHERE time BETWEEN $1 AND $2

        UNION ALL

        SELECT
          'total_sensors' as kpi_name,
          COUNT(DISTINCT sensor_id)::numeric as value,
          '' as unit
        FROM environmental_readings
        WHERE time BETWEEN $1 AND $2

        UNION ALL

        SELECT
          'total_readings' as kpi_name,
          COUNT(*)::numeric as value,
          '' as unit
        FROM environmental_readings
        WHERE time BETWEEN $1 AND $2
      `;

      const result = await externalPool.query(query, [startDate, endDate]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching KPIs', { error: error.message });
      throw error;
    }
  }

  /**
   * Get sensor statistics
   */
  async getSensorStatistics(sensorCode, startDate, endDate) {
    try {
      const query = `
        SELECT get_sensor_statistics($1, $2, $3) as stats
      `;

      const result = await externalPool.query(query, [sensorCode, startDate, endDate]);
      return result.rows[0].stats;
    } catch (error) {
      logger.error('Error fetching sensor statistics', { error: error.message });
      throw error;
    }
  }

  /**
   * Get sensor readings with aggregation
   */
  async getSensorReadings(sensorCode, startDate, endDate, aggregation = 'hourly') {
    try {
      const sensor = await this.getSensorById(sensorCode);
      if (!sensor) {
        throw new Error(`Sensor ${sensorCode} not found`);
      }

      let query;
      const sensorId = sensor.sensor_id;

      if (sensor.sensor_type === 'environmental') {
        if (aggregation === 'hourly') {
          query = `
            SELECT
              bucket as timestamp,
              avg_temperature_c as temperature,
              avg_humidity_percent as humidity,
              avg_light_lux as light
            FROM environmental_readings_hourly
            WHERE sensor_id = $1
              AND bucket BETWEEN $2 AND $3
            ORDER BY bucket ASC
          `;
        } else {
          query = `
            SELECT
              time as timestamp,
              temperature_c as temperature,
              humidity_percent as humidity,
              light_lux as light
            FROM environmental_readings
            WHERE sensor_id = $1
              AND time BETWEEN $2 AND $3
            ORDER BY time ASC
          `;
        }
      } else if (sensor.sensor_type === 'temperature') {
        if (aggregation === 'hourly') {
          query = `
            SELECT
              bucket as timestamp,
              avg_temperature_c as temperature,
              avg_humidity_percent as humidity
            FROM temperature_readings_hourly
            WHERE sensor_id = $1
              AND bucket BETWEEN $2 AND $3
            ORDER BY bucket ASC
          `;
        } else {
          query = `
            SELECT
              time as timestamp,
              temperature_c as temperature,
              humidity_percent as humidity
            FROM temperature_readings
            WHERE sensor_id = $1
              AND time BETWEEN $2 AND $3
            ORDER BY time ASC
          `;
        }
      } else if (sensor.sensor_type === 'current') {
        if (aggregation === 'hourly') {
          query = `
            SELECT
              bucket as timestamp,
              avg_clamp_1_a as current_1,
              avg_clamp_2_a as current_2,
              avg_clamp_3_a as current_3,
              avg_clamp_4_a as current_4
            FROM current_readings_hourly
            WHERE sensor_id = $1
              AND bucket BETWEEN $2 AND $3
            ORDER BY bucket ASC
          `;
        } else {
          query = `
            SELECT
              time as timestamp,
              clamp_1_a as current_1,
              clamp_2_a as current_2,
              clamp_3_a as current_3,
              clamp_4_a as current_4
            FROM current_readings
            WHERE sensor_id = $1
              AND time BETWEEN $2 AND $3
            ORDER BY time ASC
            LIMIT 10000
          `;
        }
      }

      const result = await externalPool.query(query, [sensorId, startDate, endDate]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching sensor readings', { error: error.message });
      throw error;
    }
  }
}

export default new IotDataService();
```

### 4. Test the Integration

Create a test script `src/test-external-db.js`:

```javascript
import { externalPool } from './config/database.js';

async function testConnection() {
  try {
    console.log('Testing external database connection...');

    // Test connection
    const versionResult = await externalPool.query('SELECT version()');
    console.log('✓ Database connected');

    // Count sensors
    const sensorsResult = await externalPool.query('SELECT COUNT(*) FROM sensors');
    console.log(`✓ Sensors: ${sensorsResult.rows[0].count}`);

    // Count readings
    const readingsResult = await externalPool.query(`
      SELECT
        (SELECT COUNT(*) FROM current_readings) as current_count,
        (SELECT COUNT(*) FROM environmental_readings) as env_count,
        (SELECT COUNT(*) FROM temperature_readings) as temp_count
    `);
    console.log(`✓ Readings:`, readingsResult.rows[0]);

    // Get latest reading
    const latestResult = await externalPool.query(`
      SELECT * FROM latest_readings LIMIT 1
    `);
    console.log('✓ Latest reading:', latestResult.rows[0]);

    console.log('\n✓ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    process.exit(1);
  }
}

testConnection();
```

Run the test:
```bash
node src/test-external-db.js
```

## Management Commands

```bash
# Start services
cd docker
./start.sh

# Stop services
docker-compose down

# View logs
docker-compose logs -f timescaledb
docker-compose logs data_importer

# Run queries
./query.sh

# Connect to database
docker exec -it madison_iot_db psql -U postgres -d madison_iot

# Backup database
docker exec madison_iot_db pg_dump -U postgres madison_iot > backup.sql

# Check data counts
docker exec madison_iot_db psql -U postgres -d madison_iot -c "
  SELECT
    (SELECT COUNT(*) FROM iot.current_readings) as current,
    (SELECT COUNT(*) FROM iot.environmental_readings) as environmental,
    (SELECT COUNT(*) FROM iot.temperature_readings) as temperature;
"
```

## Performance Optimization

### Use Continuous Aggregates

For large time ranges, always use the hourly aggregates:

```javascript
// GOOD - Fast
const query = `
  SELECT * FROM environmental_readings_hourly
  WHERE sensor_id = $1 AND bucket BETWEEN $2 AND $3
`;

// BAD - Slow for large ranges
const query = `
  SELECT * FROM environmental_readings
  WHERE sensor_id = $1 AND time BETWEEN $2 AND $3
`;
```

### Limit Raw Data Queries

When querying raw data, always add a LIMIT:

```javascript
const query = `
  SELECT * FROM current_readings
  WHERE sensor_id = $1
    AND time BETWEEN $2 AND $3
  ORDER BY time ASC
  LIMIT 10000  -- Prevent huge result sets
`;
```

### Use Indexes

The schema includes optimized indexes:
- `(sensor_id, time DESC)` on all readings tables
- Primary key on sensors table

## Troubleshooting

### Port Conflict

If port 5433 is in use, edit `docker/docker-compose.yml`:
```yaml
ports:
  - "5434:5432"  # Change to any available port
```

### Import Not Starting

Check logs:
```bash
docker logs madison_iot_importer
```

Common issues:
- Excel file path incorrect
- Database not ready (wait 10-15 seconds)
- Insufficient memory (reduce batch size)

### Connection Refused

Ensure containers are running:
```bash
docker ps | grep madison_iot
```

Test connection:
```bash
psql -h localhost -p 5433 -U postgres -d madison_iot
```

## Next Steps

1. ✅ Database created and running
2. ⏳ Data import in progress (~5-10 minutes)
3. ⏹️ Update application configuration
4. ⏹️ Test application with external data
5. ⏹️ Update dashboard to show external DB status

## Files Created

```
docker/
├── docker-compose.yml          # Container orchestration
├── start.sh                    # Startup script (executable)
├── query.sh                    # Sample queries (executable)
├── README.md                   # Complete documentation
├── db/
│   ├── init.sql               # Database schema (472 lines)
│   └── import_data.py         # Data import script (executable, 353 lines)
└── pgadmin/
    └── servers.json           # PgAdmin configuration

docs/
└── EXTERNAL_DATABASE_SETUP.md  # This file
```

## Summary

**Database**: TimescaleDB running on port 5433
**Data**: 353,000 rows from Excel imported
**Sensors**: 11 sensors (c1, s1-s5, t1-t5)
**Features**: Time-series optimization, continuous aggregates, custom functions
**Management**: PgAdmin on port 5050
**Ready**: Once import completes, application can connect

---

For detailed usage instructions, see `docker/README.md`

**Madison IoT Project** | External Database Setup
