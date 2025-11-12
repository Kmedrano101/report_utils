#!/bin/bash
# Madison IoT Database - Sample Queries Script

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Madison IoT Database - Sample Queries${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Helper function to run query
run_query() {
    local title="$1"
    local query="$2"

    echo -e "${YELLOW}${title}${NC}"
    echo -e "${GREEN}Query:${NC} ${query}"
    echo ""
    docker exec -it madison_iot_db psql -U postgres -d madison_iot -c "$query"
    echo ""
}

# 1. Check data counts
run_query "1. Data Counts" \
"SELECT
    'Current Readings' as table_name, COUNT(*) as count FROM iot.current_readings
UNION ALL
SELECT
    'Environmental Readings', COUNT(*) FROM iot.environmental_readings
UNION ALL
SELECT
    'Temperature Readings', COUNT(*) FROM iot.temperature_readings
UNION ALL
SELECT
    'Total Sensors', COUNT(*) FROM iot.sensors;"

# 2. List all sensors
run_query "2. All Sensors" \
"SELECT sensor_code, sensor_name, sensor_type, location
FROM iot.sensors
ORDER BY sensor_code;"

# 3. Latest readings
run_query "3. Latest Readings (First 5)" \
"SELECT * FROM iot.latest_readings LIMIT 5;"

# 4. Temperature statistics for sensor t1
run_query "4. Temperature Statistics (Sensor t1)" \
"SELECT
    sensor_code,
    COUNT(*) as total_readings,
    ROUND(AVG(temperature_c), 2) as avg_temp,
    ROUND(MIN(temperature_c), 2) as min_temp,
    ROUND(MAX(temperature_c), 2) as max_temp,
    ROUND(AVG(humidity_percent), 2) as avg_humidity
FROM iot.temperature_readings tr
JOIN iot.sensors s ON tr.sensor_id = s.sensor_id
WHERE s.sensor_code = 't1'
GROUP BY sensor_code;"

# 5. Current sensor hourly averages (last 24 hours)
run_query "5. Current Sensor Hourly Averages (Last 24 hours)" \
"SELECT
    bucket,
    ROUND(avg_clamp_1_a::numeric, 4) as avg_clamp_1_a,
    ROUND(max_clamp_1_a::numeric, 4) as max_clamp_1_a,
    reading_count
FROM iot.current_readings_hourly
WHERE sensor_id = (SELECT sensor_id FROM iot.sensors WHERE sensor_code = 'c1')
AND bucket > NOW() - INTERVAL '24 hours'
ORDER BY bucket DESC
LIMIT 10;"

# 6. Environmental sensor statistics
run_query "6. Environmental Sensor Statistics (Sensor s1)" \
"SELECT
    s.sensor_code,
    COUNT(*) as total_readings,
    ROUND(AVG(temperature_c), 2) as avg_temp,
    ROUND(AVG(humidity_percent), 2) as avg_humidity,
    ROUND(AVG(light_lux), 2) as avg_light,
    ROUND(AVG(noise_avg_db), 2) as avg_noise,
    SUM(movement) as total_movement
FROM iot.environmental_readings er
JOIN iot.sensors s ON er.sensor_id = s.sensor_id
WHERE s.sensor_code = 's1'
GROUP BY s.sensor_code;"

# 7. Time range of data
run_query "7. Data Time Range" \
"SELECT
    'Current Sensor' as sensor_type,
    MIN(time) as earliest_reading,
    MAX(time) as latest_reading,
    MAX(time) - MIN(time) as time_span
FROM iot.current_readings
UNION ALL
SELECT
    'Environmental Sensors',
    MIN(time),
    MAX(time),
    MAX(time) - MIN(time)
FROM iot.environmental_readings
UNION ALL
SELECT
    'Temperature Sensors',
    MIN(time),
    MAX(time),
    MAX(time) - MIN(time)
FROM iot.temperature_readings;"

# 8. Battery status
run_query "8. Battery Status (Latest)" \
"SELECT
    s.sensor_code,
    s.sensor_type,
    COALESCE(cr.battery_mv, er.battery_mv, tr.battery_mv) as battery_mv,
    CASE
        WHEN COALESCE(cr.battery_mv, er.battery_mv, tr.battery_mv) > 3600 THEN '✓ Good'
        WHEN COALESCE(cr.battery_mv, er.battery_mv, tr.battery_mv) > 3400 THEN '⚠ Low'
        ELSE '✗ Critical'
    END as status
FROM iot.sensors s
LEFT JOIN LATERAL (
    SELECT battery_mv FROM iot.current_readings
    WHERE sensor_id = s.sensor_id
    ORDER BY time DESC LIMIT 1
) cr ON s.sensor_type = 'current'
LEFT JOIN LATERAL (
    SELECT battery_mv FROM iot.environmental_readings
    WHERE sensor_id = s.sensor_id
    ORDER BY time DESC LIMIT 1
) er ON s.sensor_type = 'environmental'
LEFT JOIN LATERAL (
    SELECT battery_mv FROM iot.temperature_readings
    WHERE sensor_id = s.sensor_id
    ORDER BY time DESC LIMIT 1
) tr ON s.sensor_type = 'temperature'
ORDER BY s.sensor_code;"

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Sample queries completed${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "You can also use the custom function:"
echo -e "${YELLOW}SELECT iot.get_sensor_statistics('s1', '2025-10-01'::timestamptz, '2025-10-31'::timestamptz);${NC}"
echo ""
