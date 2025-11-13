#!/usr/bin/env node
/**
 * Migration Script: TimescaleDB → VictoriaMetrics
 *
 * Migrates IoT sensor data from TimescaleDB (PostgreSQL) to VictoriaMetrics
 * time-series database.
 */

import pg from 'pg';

const { Pool } = pg;

// Configuration
const CONFIG = {
  timescaledb: {
    host: 'localhost',
    port: 5433,
    database: 'madison_iot',
    user: 'postgres',
    password: 'postgres'
  },
  victoriametrics: {
    url: 'http://localhost:8428',
    importEndpoint: '/api/v1/import/prometheus'
  },
  batchSize: 1000,  // Number of metrics to send per request
  dryRun: false     // Set to true to test without actually importing
};

// Create database connection pool
const pool = new Pool(CONFIG.timescaledb);

/**
 * Convert TimescaleDB timestamp to milliseconds
 */
function toMilliseconds(timestamp) {
  return new Date(timestamp).getTime();
}

/**
 * Send metrics to VictoriaMetrics in Prometheus format
 */
async function sendMetrics(metricsData) {
  if (CONFIG.dryRun) {
    console.log(`[DRY RUN] Would send ${metricsData.length} lines to VictoriaMetrics`);
    console.log('Sample:', metricsData.slice(0, 3).join('\n'));
    return;
  }

  const url = `${CONFIG.victoriametrics.url}${CONFIG.victoriametrics.importEndpoint}`;
  const body = metricsData.join('\n');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: body
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`VictoriaMetrics import failed: ${response.status} ${errorText}`);
    }

    // VictoriaMetrics returns empty body on success
    console.log(`✓ Imported ${metricsData.length} metrics`);
    return { success: true };
  } catch (error) {
    console.error(`✗ Failed to import metrics:`, error.message);
    throw error;
  }
}

/**
 * Migrate current_readings table (electrical current sensors)
 */
async function migrateCurrentReadings() {
  console.log('\n=== Migrating Current Readings ===');

  const query = `
    SELECT
      cr.time,
      s.sensor_code,
      s.sensor_name,
      s.sensor_type,
      s.location,
      s.building,
      s.floor,
      cr.battery_mv,
      cr.clamp_1_a,
      cr.clamp_2_a,
      cr.clamp_3_a,
      cr.clamp_4_a
    FROM iot.current_readings cr
    JOIN iot.sensors s ON cr.sensor_id = s.sensor_id
    ORDER BY cr.time ASC
  `;

  console.log('Querying TimescaleDB...');
  const result = await pool.query(query);
  console.log(`Found ${result.rows.length} current readings`);

  let batch = [];
  let totalImported = 0;

  for (const row of result.rows) {
    const timestamp = toMilliseconds(row.time);
    const labels = {
      sensor_code: row.sensor_code,
      sensor_name: row.sensor_name.replace(/"/g, '\\"'),
      sensor_type: row.sensor_type,
      location: row.location || 'unknown',
      building: row.building || 'unknown',
      floor: row.floor ? row.floor.toString() : 'unknown'
    };

    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');

    // Battery voltage
    if (row.battery_mv !== null) {
      batch.push(`battery_voltage_mv{${labelStr}} ${row.battery_mv} ${timestamp}`);
    }

    // Clamp currents
    for (let i = 1; i <= 4; i++) {
      const value = row[`clamp_${i}_a`];
      if (value !== null) {
        batch.push(`clamp_current_amperes{${labelStr},clamp="${i}"} ${value} ${timestamp}`);
      }
    }

    // Send batch when it reaches the configured size
    if (batch.length >= CONFIG.batchSize) {
      await sendMetrics(batch);
      totalImported += batch.length;
      batch = [];

      // Progress indicator
      if (totalImported % 10000 === 0) {
        console.log(`  Progress: ${totalImported} metrics imported...`);
      }
    }
  }

  // Send remaining metrics
  if (batch.length > 0) {
    await sendMetrics(batch);
    totalImported += batch.length;
  }

  console.log(`✓ Migrated ${result.rows.length} current readings → ${totalImported} metrics`);
}

/**
 * Migrate environmental_readings table
 */
async function migrateEnvironmentalReadings() {
  console.log('\n=== Migrating Environmental Readings ===');

  const query = `
    SELECT
      er.time,
      s.sensor_code,
      s.sensor_name,
      s.sensor_type,
      s.location,
      s.building,
      s.floor,
      er.humidity_percent,
      er.light_lux,
      er.movement,
      er.noise_avg_db,
      er.noise_peak_db,
      er.temperature_c,
      er.battery_mv
    FROM iot.environmental_readings er
    JOIN iot.sensors s ON er.sensor_id = s.sensor_id
    ORDER BY er.time ASC
  `;

  console.log('Querying TimescaleDB...');
  const result = await pool.query(query);
  console.log(`Found ${result.rows.length} environmental readings`);

  let batch = [];
  let totalImported = 0;

  for (const row of result.rows) {
    const timestamp = toMilliseconds(row.time);
    const labels = {
      sensor_code: row.sensor_code,
      sensor_name: row.sensor_name.replace(/"/g, '\\"'),
      sensor_type: row.sensor_type,
      location: row.location || 'unknown',
      building: row.building || 'unknown',
      floor: row.floor ? row.floor.toString() : 'unknown'
    };

    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');

    // Environmental metrics
    if (row.humidity_percent !== null) {
      batch.push(`humidity_percent{${labelStr}} ${row.humidity_percent} ${timestamp}`);
    }
    if (row.light_lux !== null) {
      batch.push(`light_lux{${labelStr}} ${row.light_lux} ${timestamp}`);
    }
    if (row.movement !== null) {
      batch.push(`movement{${labelStr}} ${row.movement} ${timestamp}`);
    }
    if (row.noise_avg_db !== null) {
      batch.push(`noise_avg_db{${labelStr}} ${row.noise_avg_db} ${timestamp}`);
    }
    if (row.noise_peak_db !== null) {
      batch.push(`noise_peak_db{${labelStr}} ${row.noise_peak_db} ${timestamp}`);
    }
    if (row.temperature_c !== null) {
      batch.push(`temperature_celsius{${labelStr}} ${row.temperature_c} ${timestamp}`);
    }
    if (row.battery_mv !== null) {
      batch.push(`battery_voltage_mv{${labelStr}} ${row.battery_mv} ${timestamp}`);
    }

    // Send batch
    if (batch.length >= CONFIG.batchSize) {
      await sendMetrics(batch);
      totalImported += batch.length;
      batch = [];

      if (totalImported % 10000 === 0) {
        console.log(`  Progress: ${totalImported} metrics imported...`);
      }
    }
  }

  // Send remaining
  if (batch.length > 0) {
    await sendMetrics(batch);
    totalImported += batch.length;
  }

  console.log(`✓ Migrated ${result.rows.length} environmental readings → ${totalImported} metrics`);
}

/**
 * Migrate temperature_readings table
 */
async function migrateTemperatureReadings() {
  console.log('\n=== Migrating Temperature Readings ===');

  const query = `
    SELECT
      tr.time,
      s.sensor_code,
      s.sensor_name,
      s.sensor_type,
      s.location,
      s.building,
      s.floor,
      tr.temperature_c
    FROM iot.temperature_readings tr
    JOIN iot.sensors s ON tr.sensor_id = s.sensor_id
    ORDER BY tr.time ASC
  `;

  console.log('Querying TimescaleDB...');
  const result = await pool.query(query);
  console.log(`Found ${result.rows.length} temperature readings`);

  let batch = [];
  let totalImported = 0;

  for (const row of result.rows) {
    const timestamp = toMilliseconds(row.time);
    const labels = {
      sensor_code: row.sensor_code,
      sensor_name: row.sensor_name.replace(/"/g, '\\"'),
      sensor_type: row.sensor_type,
      location: row.location || 'unknown',
      building: row.building || 'unknown',
      floor: row.floor ? row.floor.toString() : 'unknown'
    };

    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');

    if (row.temperature_c !== null) {
      batch.push(`temperature_celsius{${labelStr}} ${row.temperature_c} ${timestamp}`);
    }

    if (batch.length >= CONFIG.batchSize) {
      await sendMetrics(batch);
      totalImported += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await sendMetrics(batch);
    totalImported += batch.length;
  }

  console.log(`✓ Migrated ${result.rows.length} temperature readings → ${totalImported} metrics`);
}

/**
 * Verify VictoriaMetrics connection
 */
async function verifyVictoriaMetrics() {
  console.log('Verifying VictoriaMetrics connection...');

  try {
    const response = await fetch(`${CONFIG.victoriametrics.url}/health`);
    if (!response.ok) {
      throw new Error(`VictoriaMetrics health check failed: ${response.status}`);
    }
    console.log('✓ VictoriaMetrics is healthy\n');
    return true;
  } catch (error) {
    console.error('✗ Cannot connect to VictoriaMetrics:', error.message);
    console.error('  Make sure VictoriaMetrics container is running on port 8428');
    return false;
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   TimescaleDB → VictoriaMetrics Migration Tool           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('Configuration:');
  console.log(`  Source: ${CONFIG.timescaledb.host}:${CONFIG.timescaledb.port}/${CONFIG.timescaledb.database}`);
  console.log(`  Target: ${CONFIG.victoriametrics.url}`);
  console.log(`  Batch Size: ${CONFIG.batchSize}`);
  console.log(`  Dry Run: ${CONFIG.dryRun ? 'YES' : 'NO'}\n`);

  const startTime = Date.now();

  try {
    // Verify connections
    console.log('Verifying connections...');
    await pool.query('SELECT 1');
    console.log('✓ TimescaleDB connection successful');

    const vmHealthy = await verifyVictoriaMetrics();
    if (!vmHealthy) {
      throw new Error('VictoriaMetrics is not available');
    }

    // Perform migrations
    await migrateCurrentReadings();
    await migrateEnvironmentalReadings();
    await migrateTemperatureReadings();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                  Migration Complete! ✓                    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`\nTotal time: ${duration} seconds`);
    console.log(`\nTo verify data in VictoriaMetrics:`);
    console.log(`  curl 'http://localhost:8428/api/v1/label/__name__/values'`);
    console.log(`  curl 'http://localhost:8428/api/v1/query?query=battery_voltage_mv'`);

  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
migrate().catch(console.error);
