-- IoT Report Utils - Database Initialization Script
-- Creates TimescaleDB extension and base schema for IoT sensor data

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Create schemas for organization
CREATE SCHEMA IF NOT EXISTS iot;
CREATE SCHEMA IF NOT EXISTS reports;

-- Set search path
SET search_path TO iot, public;

-- ============================================================
-- IoT Sensor Tables
-- ============================================================

-- Sensor types table (e.g., temperature, humidity, pressure, etc.)
CREATE TABLE IF NOT EXISTS iot.sensor_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    unit VARCHAR(50) NOT NULL,
    description TEXT,
    min_value NUMERIC,
    max_value NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sensor locations/devices table
CREATE TABLE IF NOT EXISTS iot.sensors (
    id SERIAL PRIMARY KEY,
    sensor_code VARCHAR(100) NOT NULL UNIQUE,
    sensor_type_id INTEGER NOT NULL REFERENCES iot.sensor_types(id),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sensors_type ON iot.sensors(sensor_type_id);
CREATE INDEX idx_sensors_active ON iot.sensors(is_active);
CREATE INDEX idx_sensors_location ON iot.sensors(location);

-- Sensor readings table (time-series data)
CREATE TABLE IF NOT EXISTS iot.sensor_readings (
    time TIMESTAMPTZ NOT NULL,
    sensor_id INTEGER NOT NULL REFERENCES iot.sensors(id),
    value NUMERIC NOT NULL,
    quality INTEGER DEFAULT 100, -- Data quality indicator (0-100)
    metadata JSONB,
    CONSTRAINT sensor_readings_pkey PRIMARY KEY (time, sensor_id)
);

-- Convert to TimescaleDB hypertable for efficient time-series operations
SELECT create_hypertable('iot.sensor_readings', 'time', if_not_exists => TRUE);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_time ON iot.sensor_readings(sensor_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_value ON iot.sensor_readings(value);

-- ============================================================
-- Report Management Tables
-- ============================================================

-- Report templates table
CREATE TABLE IF NOT EXISTS reports.templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    svg_template_path VARCHAR(500) NOT NULL,
    parameters JSONB, -- Expected parameters for the template
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generated reports audit table
CREATE TABLE IF NOT EXISTS reports.generated_reports (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES reports.templates(id),
    report_name VARCHAR(255) NOT NULL,
    parameters JSONB NOT NULL,
    file_path VARCHAR(500),
    file_size_kb INTEGER,
    generation_time_ms INTEGER,
    status VARCHAR(50) DEFAULT 'generated', -- generated, failed, deleted
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON reports.generated_reports(status);
CREATE INDEX idx_reports_created ON reports.generated_reports(created_at DESC);

-- ============================================================
-- KPI Configuration Table
-- ============================================================

CREATE TABLE IF NOT EXISTS reports.kpi_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    calculation_type VARCHAR(50) NOT NULL, -- avg, min, max, sum, count, custom
    sensor_type_id INTEGER REFERENCES iot.sensor_types(id),
    sql_query TEXT, -- For custom KPI calculations
    unit VARCHAR(50),
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Useful Views
-- ============================================================

-- View for latest sensor readings
CREATE OR REPLACE VIEW iot.latest_sensor_readings AS
SELECT DISTINCT ON (sensor_id)
    sensor_id,
    time,
    value,
    quality
FROM iot.sensor_readings
ORDER BY sensor_id, time DESC;

-- View for sensor summary with latest values
CREATE OR REPLACE VIEW iot.sensors_with_latest AS
SELECT
    s.id,
    s.sensor_code,
    s.name,
    s.location,
    st.name AS sensor_type,
    st.unit,
    lr.value AS latest_value,
    lr.time AS latest_reading_time,
    s.is_active
FROM iot.sensors s
JOIN iot.sensor_types st ON s.sensor_type_id = st.id
LEFT JOIN iot.latest_sensor_readings lr ON s.id = lr.sensor_id
ORDER BY s.name;

-- ============================================================
-- Continuous Aggregates for Performance (TimescaleDB feature)
-- ============================================================

-- Hourly aggregates for faster reporting
CREATE MATERIALIZED VIEW IF NOT EXISTS iot.sensor_readings_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    sensor_id,
    AVG(value) AS avg_value,
    MIN(value) AS min_value,
    MAX(value) AS max_value,
    COUNT(*) AS reading_count,
    AVG(quality) AS avg_quality
FROM iot.sensor_readings
GROUP BY bucket, sensor_id
WITH NO DATA;

-- Refresh policy: update hourly aggregates automatically
SELECT add_continuous_aggregate_policy('iot.sensor_readings_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Daily aggregates for historical reporting
CREATE MATERIALIZED VIEW IF NOT EXISTS iot.sensor_readings_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS bucket,
    sensor_id,
    AVG(value) AS avg_value,
    MIN(value) AS min_value,
    MAX(value) AS max_value,
    COUNT(*) AS reading_count,
    STDDEV(value) AS stddev_value
FROM iot.sensor_readings
GROUP BY bucket, sensor_id
WITH NO DATA;

-- Refresh policy: update daily aggregates
SELECT add_continuous_aggregate_policy('iot.sensor_readings_daily',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- ============================================================
-- Utility Functions
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_sensors_updated_at BEFORE UPDATE ON iot.sensors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON reports.templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Grant Permissions
-- ============================================================

-- Grant usage on schemas
GRANT USAGE ON SCHEMA iot TO PUBLIC;
GRANT USAGE ON SCHEMA reports TO PUBLIC;

-- Grant select on all tables
GRANT SELECT ON ALL TABLES IN SCHEMA iot TO PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA reports TO PUBLIC;

-- Grant insert/update/delete for application user (adjust as needed)
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA iot TO PUBLIC;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA reports TO PUBLIC;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA iot TO PUBLIC;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA reports TO PUBLIC;

COMMENT ON SCHEMA iot IS 'IoT sensor data and time-series readings';
COMMENT ON SCHEMA reports IS 'Report templates and generation audit trail';
