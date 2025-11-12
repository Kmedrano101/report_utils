-- ============================================================================
-- Madison IoT Database Schema
-- TimescaleDB for time-series data
-- ============================================================================

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ============================================================================
-- SCHEMA: Create schema for IoT data
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS iot;

-- ============================================================================
-- TABLE: Sensors
-- Stores metadata about each sensor
-- ============================================================================
CREATE TABLE IF NOT EXISTS iot.sensors (
    sensor_id SERIAL PRIMARY KEY,
    sensor_code VARCHAR(10) UNIQUE NOT NULL,  -- 'c1', 's1', 't1', etc.
    sensor_name VARCHAR(100) NOT NULL,
    sensor_type VARCHAR(50) NOT NULL,  -- 'current', 'environmental', 'temperature'
    location VARCHAR(200),
    building VARCHAR(100),
    floor INTEGER,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: Current Sensor Readings (Sensor c1)
-- High-frequency current measurements from 4 clamps
-- ============================================================================
CREATE TABLE IF NOT EXISTS iot.current_readings (
    time TIMESTAMPTZ NOT NULL,
    sensor_id INTEGER NOT NULL REFERENCES iot.sensors(sensor_id),
    battery_mv NUMERIC(10, 2),
    clamp_1_a NUMERIC(10, 4),  -- Amperes with 4 decimal precision
    clamp_2_a NUMERIC(10, 4),
    clamp_3_a NUMERIC(10, 4),
    clamp_4_a NUMERIC(10, 4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create hypertable for time-series optimization
SELECT create_hypertable('iot.current_readings', 'time',
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '1 day'
);

-- Create index on sensor_id for faster queries
CREATE INDEX IF NOT EXISTS idx_current_readings_sensor_id
    ON iot.current_readings (sensor_id, time DESC);

-- ============================================================================
-- TABLE: Environmental Sensor Readings (Sensors s1-s5)
-- Temperature, humidity, light, movement, and noise measurements
-- ============================================================================
CREATE TABLE IF NOT EXISTS iot.environmental_readings (
    time TIMESTAMPTZ NOT NULL,
    sensor_id INTEGER NOT NULL REFERENCES iot.sensors(sensor_id),
    humidity_percent INTEGER,
    light_lux INTEGER,
    movement INTEGER,
    noise_avg_db INTEGER,
    noise_peak_db INTEGER,
    temperature_c NUMERIC(5, 2),
    battery_mv INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create hypertable for time-series optimization
SELECT create_hypertable('iot.environmental_readings', 'time',
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '7 days'
);

-- Create index on sensor_id for faster queries
CREATE INDEX IF NOT EXISTS idx_environmental_readings_sensor_id
    ON iot.environmental_readings (sensor_id, time DESC);

-- ============================================================================
-- TABLE: Temperature Sensor Readings (Sensors t1-t5)
-- Simple temperature and humidity measurements
-- ============================================================================
CREATE TABLE IF NOT EXISTS iot.temperature_readings (
    time TIMESTAMPTZ NOT NULL,
    sensor_id INTEGER NOT NULL REFERENCES iot.sensors(sensor_id),
    humidity_percent INTEGER,
    temperature_c NUMERIC(5, 2),
    battery_mv INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create hypertable for time-series optimization
SELECT create_hypertable('iot.temperature_readings', 'time',
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '7 days'
);

-- Create index on sensor_id for faster queries
CREATE INDEX IF NOT EXISTS idx_temperature_readings_sensor_id
    ON iot.temperature_readings (sensor_id, time DESC);

-- ============================================================================
-- VIEWS: Unified views for easier querying
-- ============================================================================

-- View: Latest sensor readings across all types
CREATE OR REPLACE VIEW iot.latest_readings AS
SELECT
    s.sensor_code,
    s.sensor_name,
    s.sensor_type,
    s.location,
    cr.time AS last_reading_time,
    cr.battery_mv,
    NULL::INTEGER AS humidity_percent,
    NULL::NUMERIC AS temperature_c,
    NULL::INTEGER AS light_lux,
    json_build_object(
        'clamp_1_a', cr.clamp_1_a,
        'clamp_2_a', cr.clamp_2_a,
        'clamp_3_a', cr.clamp_3_a,
        'clamp_4_a', cr.clamp_4_a
    ) AS readings
FROM iot.sensors s
LEFT JOIN LATERAL (
    SELECT * FROM iot.current_readings
    WHERE sensor_id = s.sensor_id
    ORDER BY time DESC LIMIT 1
) cr ON s.sensor_type = 'current'

UNION ALL

SELECT
    s.sensor_code,
    s.sensor_name,
    s.sensor_type,
    s.location,
    er.time AS last_reading_time,
    er.battery_mv,
    er.humidity_percent,
    er.temperature_c,
    er.light_lux,
    json_build_object(
        'movement', er.movement,
        'noise_avg_db', er.noise_avg_db,
        'noise_peak_db', er.noise_peak_db
    ) AS readings
FROM iot.sensors s
LEFT JOIN LATERAL (
    SELECT * FROM iot.environmental_readings
    WHERE sensor_id = s.sensor_id
    ORDER BY time DESC LIMIT 1
) er ON s.sensor_type = 'environmental'

UNION ALL

SELECT
    s.sensor_code,
    s.sensor_name,
    s.sensor_type,
    s.location,
    tr.time AS last_reading_time,
    tr.battery_mv,
    tr.humidity_percent,
    tr.temperature_c,
    NULL::INTEGER AS light_lux,
    NULL::JSON AS readings
FROM iot.sensors s
LEFT JOIN LATERAL (
    SELECT * FROM iot.temperature_readings
    WHERE sensor_id = s.sensor_id
    ORDER BY time DESC LIMIT 1
) tr ON s.sensor_type = 'temperature';

-- ============================================================================
-- FUNCTIONS: Helper functions for data analysis
-- ============================================================================

-- Function: Get sensor statistics for a time range
CREATE OR REPLACE FUNCTION iot.get_sensor_statistics(
    p_sensor_code VARCHAR,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
    v_sensor_id INTEGER;
    v_sensor_type VARCHAR;
    v_result JSON;
BEGIN
    -- Get sensor info
    SELECT sensor_id, sensor_type INTO v_sensor_id, v_sensor_type
    FROM iot.sensors WHERE sensor_code = p_sensor_code;

    IF v_sensor_id IS NULL THEN
        RETURN json_build_object('error', 'Sensor not found');
    END IF;

    -- Get statistics based on sensor type
    IF v_sensor_type = 'current' THEN
        SELECT json_build_object(
            'sensor_code', p_sensor_code,
            'sensor_type', v_sensor_type,
            'period_start', p_start_time,
            'period_end', p_end_time,
            'total_readings', COUNT(*),
            'avg_battery_mv', ROUND(AVG(battery_mv), 2),
            'avg_clamp_1_a', ROUND(AVG(clamp_1_a), 4),
            'avg_clamp_2_a', ROUND(AVG(clamp_2_a), 4),
            'avg_clamp_3_a', ROUND(AVG(clamp_3_a), 4),
            'avg_clamp_4_a', ROUND(AVG(clamp_4_a), 4),
            'max_clamp_1_a', ROUND(MAX(clamp_1_a), 4),
            'max_clamp_2_a', ROUND(MAX(clamp_2_a), 4),
            'max_clamp_3_a', ROUND(MAX(clamp_3_a), 4),
            'max_clamp_4_a', ROUND(MAX(clamp_4_a), 4)
        ) INTO v_result
        FROM iot.current_readings
        WHERE sensor_id = v_sensor_id
          AND time BETWEEN p_start_time AND p_end_time;

    ELSIF v_sensor_type = 'environmental' THEN
        SELECT json_build_object(
            'sensor_code', p_sensor_code,
            'sensor_type', v_sensor_type,
            'period_start', p_start_time,
            'period_end', p_end_time,
            'total_readings', COUNT(*),
            'avg_temperature_c', ROUND(AVG(temperature_c), 2),
            'min_temperature_c', ROUND(MIN(temperature_c), 2),
            'max_temperature_c', ROUND(MAX(temperature_c), 2),
            'avg_humidity_percent', ROUND(AVG(humidity_percent), 2),
            'avg_light_lux', ROUND(AVG(light_lux), 2),
            'avg_noise_avg_db', ROUND(AVG(noise_avg_db), 2),
            'max_noise_peak_db', MAX(noise_peak_db),
            'total_movement', SUM(movement),
            'avg_battery_mv', ROUND(AVG(battery_mv), 2)
        ) INTO v_result
        FROM iot.environmental_readings
        WHERE sensor_id = v_sensor_id
          AND time BETWEEN p_start_time AND p_end_time;

    ELSIF v_sensor_type = 'temperature' THEN
        SELECT json_build_object(
            'sensor_code', p_sensor_code,
            'sensor_type', v_sensor_type,
            'period_start', p_start_time,
            'period_end', p_end_time,
            'total_readings', COUNT(*),
            'avg_temperature_c', ROUND(AVG(temperature_c), 2),
            'min_temperature_c', ROUND(MIN(temperature_c), 2),
            'max_temperature_c', ROUND(MAX(temperature_c), 2),
            'avg_humidity_percent', ROUND(AVG(humidity_percent), 2),
            'min_humidity_percent', MIN(humidity_percent),
            'max_humidity_percent', MAX(humidity_percent),
            'avg_battery_mv', ROUND(AVG(battery_mv), 2)
        ) INTO v_result
        FROM iot.temperature_readings
        WHERE sensor_id = v_sensor_id
          AND time BETWEEN p_start_time AND p_end_time;
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA: Insert sensor metadata
-- ============================================================================
INSERT INTO iot.sensors (sensor_code, sensor_name, sensor_type, location, building) VALUES
    ('c1', 'Current Sensor C1', 'current', 'Electrical Panel', 'Madison Building'),
    ('s1', 'Environmental Sensor S1', 'environmental', 'Office Area 1', 'Madison Building'),
    ('s2', 'Environmental Sensor S2', 'environmental', 'Office Area 2', 'Madison Building'),
    ('s3', 'Environmental Sensor S3', 'environmental', 'Office Area 3', 'Madison Building'),
    ('s4', 'Environmental Sensor S4', 'environmental', 'Meeting Room 1', 'Madison Building'),
    ('s5', 'Environmental Sensor S5', 'environmental', 'Meeting Room 2', 'Madison Building'),
    ('t1', 'Temperature Sensor T1', 'temperature', 'Hallway 1', 'Madison Building'),
    ('t2', 'Temperature Sensor T2', 'temperature', 'Hallway 2', 'Madison Building'),
    ('t3', 'Temperature Sensor T3', 'temperature', 'Server Room', 'Madison Building'),
    ('t4', 'Temperature Sensor T4', 'temperature', 'Storage Room 1', 'Madison Building'),
    ('t5', 'Temperature Sensor T5', 'temperature', 'Storage Room 2', 'Madison Building')
ON CONFLICT (sensor_code) DO NOTHING;

-- ============================================================================
-- CONTINUOUS AGGREGATES: Pre-computed rollups for faster queries
-- ============================================================================

-- Hourly aggregates for environmental sensors
CREATE MATERIALIZED VIEW IF NOT EXISTS iot.environmental_readings_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    sensor_id,
    AVG(temperature_c) AS avg_temperature_c,
    MIN(temperature_c) AS min_temperature_c,
    MAX(temperature_c) AS max_temperature_c,
    AVG(humidity_percent) AS avg_humidity_percent,
    AVG(light_lux) AS avg_light_lux,
    AVG(noise_avg_db) AS avg_noise_avg_db,
    MAX(noise_peak_db) AS max_noise_peak_db,
    SUM(movement) AS total_movement,
    COUNT(*) AS reading_count
FROM iot.environmental_readings
GROUP BY bucket, sensor_id
WITH NO DATA;

-- Add refresh policy (automatic updates)
SELECT add_continuous_aggregate_policy('iot.environmental_readings_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Hourly aggregates for temperature sensors
CREATE MATERIALIZED VIEW IF NOT EXISTS iot.temperature_readings_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    sensor_id,
    AVG(temperature_c) AS avg_temperature_c,
    MIN(temperature_c) AS min_temperature_c,
    MAX(temperature_c) AS max_temperature_c,
    AVG(humidity_percent) AS avg_humidity_percent,
    COUNT(*) AS reading_count
FROM iot.temperature_readings
GROUP BY bucket, sensor_id
WITH NO DATA;

-- Add refresh policy
SELECT add_continuous_aggregate_policy('iot.temperature_readings_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Hourly aggregates for current sensors
CREATE MATERIALIZED VIEW IF NOT EXISTS iot.current_readings_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    sensor_id,
    AVG(clamp_1_a) AS avg_clamp_1_a,
    MAX(clamp_1_a) AS max_clamp_1_a,
    AVG(clamp_2_a) AS avg_clamp_2_a,
    MAX(clamp_2_a) AS max_clamp_2_a,
    AVG(clamp_3_a) AS avg_clamp_3_a,
    MAX(clamp_3_a) AS max_clamp_3_a,
    AVG(clamp_4_a) AS avg_clamp_4_a,
    MAX(clamp_4_a) AS max_clamp_4_a,
    AVG(battery_mv) AS avg_battery_mv,
    COUNT(*) AS reading_count
FROM iot.current_readings
GROUP BY bucket, sensor_id
WITH NO DATA;

-- Add refresh policy
SELECT add_continuous_aggregate_policy('iot.current_readings_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- ============================================================================
-- GRANTS: Set up permissions
-- ============================================================================
GRANT USAGE ON SCHEMA iot TO PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA iot TO PUBLIC;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA iot TO PUBLIC;

-- ============================================================================
-- COMPLETED
-- ============================================================================
