-- IoT Report Utils - Sample Data Seed Script
-- Populates database with sample IoT sensors and readings for testing

SET search_path TO iot, public;

-- ============================================================
-- Seed Sensor Types
-- ============================================================

INSERT INTO iot.sensor_types (name, unit, description, min_value, max_value) VALUES
    ('temperature', '°C', 'Temperature sensor', -40, 85),
    ('humidity', '%', 'Relative humidity sensor', 0, 100),
    ('pressure', 'hPa', 'Atmospheric pressure sensor', 300, 1100),
    ('co2', 'ppm', 'Carbon dioxide concentration', 0, 5000),
    ('light', 'lux', 'Light intensity sensor', 0, 100000),
    ('motion', 'boolean', 'Motion detection sensor', 0, 1),
    ('voltage', 'V', 'Voltage sensor', 0, 240),
    ('current', 'A', 'Current sensor', 0, 100),
    ('power', 'W', 'Power consumption sensor', 0, 10000),
    ('water_flow', 'L/min', 'Water flow rate sensor', 0, 1000)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Seed Sensors (Devices)
-- ============================================================

INSERT INTO iot.sensors (sensor_code, sensor_type_id, name, location, latitude, longitude, metadata) VALUES
    -- Building A - Floor 1
    ('TEMP-A101', (SELECT id FROM iot.sensor_types WHERE name = 'temperature'), 'Temperature Sensor A101', 'Building A - Room 101', 40.4168, -3.7038, '{"floor": 1, "building": "A", "room": "101"}'),
    ('HUM-A101', (SELECT id FROM iot.sensor_types WHERE name = 'humidity'), 'Humidity Sensor A101', 'Building A - Room 101', 40.4168, -3.7038, '{"floor": 1, "building": "A", "room": "101"}'),
    ('CO2-A101', (SELECT id FROM iot.sensor_types WHERE name = 'co2'), 'CO2 Sensor A101', 'Building A - Room 101', 40.4168, -3.7038, '{"floor": 1, "building": "A", "room": "101"}'),

    -- Building A - Floor 2
    ('TEMP-A201', (SELECT id FROM iot.sensor_types WHERE name = 'temperature'), 'Temperature Sensor A201', 'Building A - Room 201', 40.4169, -3.7039, '{"floor": 2, "building": "A", "room": "201"}'),
    ('HUM-A201', (SELECT id FROM iot.sensor_types WHERE name = 'humidity'), 'Humidity Sensor A201', 'Building A - Room 201', 40.4169, -3.7039, '{"floor": 2, "building": "A", "room": "201"}'),
    ('LIGHT-A201', (SELECT id FROM iot.sensor_types WHERE name = 'light'), 'Light Sensor A201', 'Building A - Room 201', 40.4169, -3.7039, '{"floor": 2, "building": "A", "room": "201"}'),

    -- Building B - Floor 1
    ('TEMP-B101', (SELECT id FROM iot.sensor_types WHERE name = 'temperature'), 'Temperature Sensor B101', 'Building B - Server Room', 40.4170, -3.7040, '{"floor": 1, "building": "B", "room": "Server Room"}'),
    ('HUM-B101', (SELECT id FROM iot.sensor_types WHERE name = 'humidity'), 'Humidity Sensor B101', 'Building B - Server Room', 40.4170, -3.7040, '{"floor": 1, "building": "B", "room": "Server Room"}'),
    ('POWER-B101', (SELECT id FROM iot.sensor_types WHERE name = 'power'), 'Power Meter B101', 'Building B - Server Room', 40.4170, -3.7040, '{"floor": 1, "building": "B", "room": "Server Room"}'),

    -- Building C - Outdoor
    ('TEMP-C001', (SELECT id FROM iot.sensor_types WHERE name = 'temperature'), 'Outdoor Temperature Sensor', 'Building C - Outdoor', 40.4171, -3.7041, '{"location_type": "outdoor", "building": "C"}'),
    ('PRESS-C001', (SELECT id FROM iot.sensor_types WHERE name = 'pressure'), 'Atmospheric Pressure Sensor', 'Building C - Outdoor', 40.4171, -3.7041, '{"location_type": "outdoor", "building": "C"}'),
    ('WATER-C001', (SELECT id FROM iot.sensor_types WHERE name = 'water_flow'), 'Water Flow Meter', 'Building C - Main Supply', 40.4171, -3.7041, '{"location_type": "outdoor", "building": "C"}')
ON CONFLICT (sensor_code) DO NOTHING;

-- ============================================================
-- Generate Sample Sensor Readings (Last 30 days)
-- ============================================================

-- Function to generate realistic sensor data
DO $$
DECLARE
    sensor_rec RECORD;
    start_time TIMESTAMPTZ := NOW() - INTERVAL '30 days';
    end_time TIMESTAMPTZ := NOW();
    reading_time TIMESTAMPTZ;
    base_value NUMERIC;
    random_variation NUMERIC;
    reading_value NUMERIC;
BEGIN
    -- Loop through each sensor
    FOR sensor_rec IN
        SELECT s.id, s.sensor_code, st.name as type_name, st.min_value, st.max_value
        FROM iot.sensors s
        JOIN iot.sensor_types st ON s.sensor_type_id = st.id
    LOOP
        -- Generate readings every 5 minutes for the last 30 days
        reading_time := start_time;

        -- Set base value based on sensor type
        CASE sensor_rec.type_name
            WHEN 'temperature' THEN base_value := 22.0;
            WHEN 'humidity' THEN base_value := 50.0;
            WHEN 'pressure' THEN base_value := 1013.25;
            WHEN 'co2' THEN base_value := 450.0;
            WHEN 'light' THEN base_value := 500.0;
            WHEN 'motion' THEN base_value := 0.0;
            WHEN 'voltage' THEN base_value := 220.0;
            WHEN 'current' THEN base_value := 5.0;
            WHEN 'power' THEN base_value := 1200.0;
            WHEN 'water_flow' THEN base_value := 10.0;
            ELSE base_value := 50.0;
        END CASE;

        WHILE reading_time <= end_time LOOP
            -- Add realistic variations and patterns

            -- Daily pattern (temperature higher during day, etc.)
            random_variation := base_value * 0.1 * (RANDOM() - 0.5);

            -- Add daily cycle
            IF sensor_rec.type_name = 'temperature' THEN
                reading_value := base_value + 3 * SIN((EXTRACT(HOUR FROM reading_time) - 6) * PI() / 12) + random_variation;
            ELSIF sensor_rec.type_name = 'light' THEN
                -- Light is high during day (8am-8pm)
                IF EXTRACT(HOUR FROM reading_time) BETWEEN 8 AND 20 THEN
                    reading_value := base_value * 2 + random_variation * 100;
                ELSE
                    reading_value := base_value * 0.1 + random_variation * 10;
                END IF;
            ELSIF sensor_rec.type_name = 'power' THEN
                -- Power consumption higher during business hours
                IF EXTRACT(HOUR FROM reading_time) BETWEEN 8 AND 18 AND EXTRACT(DOW FROM reading_time) BETWEEN 1 AND 5 THEN
                    reading_value := base_value * 1.5 + random_variation;
                ELSE
                    reading_value := base_value * 0.6 + random_variation;
                END IF;
            ELSIF sensor_rec.type_name = 'motion' THEN
                -- Motion detection (boolean-like)
                reading_value := CASE WHEN RANDOM() > 0.7 THEN 1 ELSE 0 END;
            ELSE
                reading_value := base_value + random_variation;
            END IF;

            -- Ensure value is within sensor limits
            IF sensor_rec.min_value IS NOT NULL THEN
                reading_value := GREATEST(reading_value, sensor_rec.min_value);
            END IF;
            IF sensor_rec.max_value IS NOT NULL THEN
                reading_value := LEAST(reading_value, sensor_rec.max_value);
            END IF;

            -- Insert reading
            INSERT INTO iot.sensor_readings (time, sensor_id, value, quality)
            VALUES (
                reading_time,
                sensor_rec.id,
                ROUND(reading_value::NUMERIC, 2),
                90 + FLOOR(RANDOM() * 10)::INTEGER -- Quality between 90-100
            );

            -- Increment time by 5 minutes
            reading_time := reading_time + INTERVAL '5 minutes';
        END LOOP;

        RAISE NOTICE 'Generated readings for sensor: %', sensor_rec.sensor_code;
    END LOOP;
END $$;

-- ============================================================
-- Seed Report Templates
-- ============================================================

INSERT INTO reports.templates (name, description, svg_template_path, parameters) VALUES
    (
        'iot-summary-report',
        'IoT Sensor Summary Report - Overview of all sensors and latest readings',
        'templates/svg/iot-summary-report.svg',
        '{"sensors": [], "date_range": {"start": "date", "end": "date"}, "include_charts": true}'
    ),
    (
        'sensor-detailed-report',
        'Detailed Report for Specific Sensor - Time-series analysis with statistics',
        'templates/svg/sensor-detailed-report.svg',
        '{"sensor_id": "number", "date_range": {"start": "date", "end": "date"}, "include_statistics": true, "include_chart": true}'
    ),
    (
        'kpi-dashboard-report',
        'KPI Dashboard Report - Key performance indicators and trends',
        'templates/svg/kpi-dashboard-report.svg',
        '{"kpi_ids": [], "date_range": {"start": "date", "end": "date"}, "comparison_enabled": true}'
    ),
    (
        'building-report',
        'Building Environmental Report - All sensors in a specific building',
        'templates/svg/building-report.svg',
        '{"building": "string", "date_range": {"start": "date", "end": "date"}}'
    )
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Seed KPI Definitions
-- ============================================================

INSERT INTO reports.kpi_definitions (name, description, calculation_type, sensor_type_id, unit) VALUES
    (
        'avg-temperature',
        'Average temperature across all temperature sensors',
        'avg',
        (SELECT id FROM iot.sensor_types WHERE name = 'temperature'),
        '°C'
    ),
    (
        'max-co2',
        'Maximum CO2 level recorded',
        'max',
        (SELECT id FROM iot.sensor_types WHERE name = 'co2'),
        'ppm'
    ),
    (
        'total-power-consumption',
        'Total power consumption',
        'sum',
        (SELECT id FROM iot.sensor_types WHERE name = 'power'),
        'kWh'
    ),
    (
        'avg-humidity',
        'Average humidity level',
        'avg',
        (SELECT id FROM iot.sensor_types WHERE name = 'humidity'),
        '%'
    ),
    (
        'sensor-uptime',
        'Percentage of sensors reporting data',
        'custom',
        NULL,
        '%'
    )
ON CONFLICT (name) DO NOTHING;

-- Custom SQL for sensor uptime KPI
UPDATE reports.kpi_definitions
SET sql_query = '
    SELECT
        COUNT(DISTINCT lr.sensor_id)::NUMERIC / COUNT(DISTINCT s.id)::NUMERIC * 100 as uptime_percentage
    FROM iot.sensors s
    LEFT JOIN iot.latest_sensor_readings lr ON s.id = lr.sensor_id
    WHERE s.is_active = true
        AND (lr.time IS NULL OR lr.time >= NOW() - INTERVAL ''1 hour'')
'
WHERE name = 'sensor-uptime';

-- ============================================================
-- Refresh materialized views
-- ============================================================

REFRESH MATERIALIZED VIEW iot.sensor_readings_hourly;
REFRESH MATERIALIZED VIEW iot.sensor_readings_daily;

-- ============================================================
-- Summary Output
-- ============================================================

DO $$
DECLARE
    sensor_count INTEGER;
    reading_count INTEGER;
    template_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO sensor_count FROM iot.sensors;
    SELECT COUNT(*) INTO reading_count FROM iot.sensor_readings;
    SELECT COUNT(*) INTO template_count FROM reports.templates;

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Database seeding completed successfully!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Sensors created: %', sensor_count;
    RAISE NOTICE 'Readings generated: %', reading_count;
    RAISE NOTICE 'Report templates: %', template_count;
    RAISE NOTICE '===========================================';
END $$;
