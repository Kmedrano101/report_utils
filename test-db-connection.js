import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5433,
  database: 'madison_iot',
  user: 'postgres',
  password: 'postgres',
  connectionTimeoutMillis: 5000
};

console.log('Testing connection with config:', {
  ...config,
  password: '***'
});

const client = new Client(config);

try {
  await client.connect();
  console.log('✓ Connected successfully!');

  const result = await client.query('SELECT version(), NOW() as current_time');
  console.log('✓ Query executed');
  console.log('  Version:', result.rows[0].version.substring(0, 50) + '...');
  console.log('  Time:', result.rows[0].current_time);

  // Check for TimescaleDB
  try {
    const tsResult = await client.query(
      "SELECT extversion FROM pg_extension WHERE extname = 'timescaledb'"
    );
    if (tsResult.rows.length > 0) {
      console.log('  TimescaleDB:', tsResult.rows[0].extversion);
    }
  } catch (err) {
    console.log('  TimescaleDB: not installed');
  }

  // Check data
  const sensors = await client.query('SELECT COUNT(*) FROM iot.sensors');
  const readings = await client.query('SELECT COUNT(*) FROM iot.current_readings');
  console.log('  Sensors:', sensors.rows[0].count);
  console.log('  Readings:', readings.rows[0].count);

  await client.end();
  console.log('\n✓ Connection test completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('✗ Connection failed!');
  console.error('  Error:', error.message);
  console.error('  Code:', error.code);
  console.error('  Stack:', error.stack);
  process.exit(1);
}
