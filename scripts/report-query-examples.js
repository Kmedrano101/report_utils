/**
 * Report Query Examples for VictoriaMetrics
 * Using sensor mapping: t1-t15 (temperature), s1-s2 (sound), c1-c2 (clamps)
 */

import { readFile } from 'fs/promises';

// Load sensor mapping
const mapping = JSON.parse(await readFile('./sensor-mapping.json', 'utf-8'));

const API_URL = 'https://api.iot.tidop.es/v1/vm';
const AUTH_TOKEN = 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw';

/**
 * Helper function to query VictoriaMetrics
 */
async function vmQuery(endpoint, body) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'authorization': AUTH_TOKEN
        },
        body: JSON.stringify(body)
    });
    return await response.json();
}

/**
 * Get sensor ID from friendly name (t1, s1, c1, etc.)
 */
function getSensorId(sensorName) {
    const type = sensorName[0]; // t, s, or c

    if (type === 't') return mapping.temperature[sensorName];
    if (type === 's') return mapping.sound[sensorName];
    if (type === 'c') return mapping.clamp[sensorName];

    throw new Error(`Unknown sensor: ${sensorName}`);
}

console.log('=== VictoriaMetrics Report Query Examples ===\n');

// Example 1: Average temperature for t1 over last 20 days
console.log('1. Average temperature for t1 (last 20 days)');
const t1Id = getSensorId('t1');
const result1 = await vmQuery('/query', {
    query: `avg_over_time(iot_sensor_reading{sensor_id="${t1Id}", sensor_type="temperature"}[20d])`,
    time: new Date().toISOString()
});
console.log(`   Sensor: t1 (${t1Id})`);
console.log(`   Average: ${result1.result?.[0]?.values?.[0] || 'N/A'}°C`);

// Example 2: Temperature range query for t1-t5 (last 7 days, hourly data)
console.log('\n2. Temperature time series for t1 (last 7 days, hourly)');
const result2 = await vmQuery('/query_range', {
    query: `iot_sensor_reading{sensor_id="${t1Id}", sensor_type="temperature"}`,
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
    step: '1h'
});
const dataPoints = result2.result?.[0]?.values?.length || 0;
console.log(`   Sensor: t1 (${t1Id})`);
console.log(`   Data points: ${dataPoints}`);
if (dataPoints > 0) {
    const firstValue = result2.result[0].values[0];
    const lastValue = result2.result[0].values[dataPoints - 1];
    console.log(`   First value: ${firstValue}°C`);
    console.log(`   Last value: ${lastValue}°C`);
}

// Example 3: All temperature sensors average (last 24 hours)
console.log('\n3. Average temperature across all sensors (last 24 hours)');
const result3 = await vmQuery('/query', {
    query: 'avg(avg_over_time(iot_sensor_reading{sensor_type="temperature"}[24h]))',
    time: new Date().toISOString()
});
console.log(`   Overall average: ${result3.result?.[0]?.values?.[0] || 'N/A'}°C`);

// Example 4: Sound level for s1 (last 24 hours average)
console.log('\n4. Sound level for s1 (last 24 hours)');
const s1Id = getSensorId('s1');
const result4 = await vmQuery('/query', {
    query: `avg_over_time(iot_sensor_reading{sensor_id="${s1Id}", sensor_type="soundAvg"}[24h])`,
    time: new Date().toISOString()
});
console.log(`   Sensor: s1 (${s1Id})`);
console.log(`   Average sound: ${result4.result?.[0]?.values?.[0] || 'N/A'} dB`);

// Example 5: Current clamp c1 - all 4 clamps (last hour average)
console.log('\n5. Current clamps for c1 (last hour average)');
const c1Id = getSensorId('c1');
for (let i = 1; i <= 4; i++) {
    const result = await vmQuery('/query', {
        query: `avg_over_time(iot_sensor_reading{sensor_id="${c1Id}", sensor_type="current_clamp_${i}"}[1h])`,
        time: new Date().toISOString()
    });
    const current = result.result?.[0]?.values?.[0] || 'N/A';
    console.log(`   Clamp ${i}: ${current} A`);
}

// Example 6: Humidity for all sensors with humidity (current value)
console.log('\n6. Current humidity for all sensors');
const result6 = await vmQuery('/query', {
    query: 'iot_sensor_reading{sensor_type="humidity"}',
    time: new Date().toISOString()
});
if (result6.result?.length > 0) {
    result6.result.slice(0, 5).forEach(item => {
        const sensorId = item.metric.sensor_id;
        const humidity = item.values?.[0] || 'N/A';

        // Find friendly name
        let friendlyName = sensorId;
        for (const [key, val] of Object.entries(mapping.temperature)) {
            if (val === sensorId) {
                friendlyName = key;
                break;
            }
        }

        console.log(`   ${friendlyName} (${sensorId}): ${humidity}%`);
    });
    if (result6.result.length > 5) {
        console.log(`   ... and ${result6.result.length - 5} more sensors`);
    }
}

// Example 7: Min/Max/Avg temperature for t1 over last 30 days
console.log('\n7. Temperature statistics for t1 (last 30 days)');
const queries = [
    { label: 'Min', query: `min_over_time(iot_sensor_reading{sensor_id="${t1Id}", sensor_type="temperature"}[30d])` },
    { label: 'Max', query: `max_over_time(iot_sensor_reading{sensor_id="${t1Id}", sensor_type="temperature"}[30d])` },
    { label: 'Avg', query: `avg_over_time(iot_sensor_reading{sensor_id="${t1Id}", sensor_type="temperature"}[30d])` }
];

for (const { label, query } of queries) {
    const result = await vmQuery('/query', { query, time: new Date().toISOString() });
    const value = result.result?.[0]?.values?.[0] || 'N/A';
    console.log(`   ${label}: ${value}°C`);
}

// Example 8: Compare average temperature t1 vs t2 (last 7 days)
console.log('\n8. Compare temperature t1 vs t2 (last 7 days average)');
for (const sensor of ['t1', 't2']) {
    const sensorId = getSensorId(sensor);
    const result = await vmQuery('/query', {
        query: `avg_over_time(iot_sensor_reading{sensor_id="${sensorId}", sensor_type="temperature"}[7d])`,
        time: new Date().toISOString()
    });
    const avg = result.result?.[0]?.values?.[0] || 'N/A';
    console.log(`   ${sensor} (${sensorId}): ${avg}°C`);
}

console.log('\n=== QUERY TEMPLATES ===\n');

console.log(`
// Get average for specific sensor over time period
const query = \`avg_over_time(iot_sensor_reading{sensor_id="\${sensorId}", sensor_type="\${type}"}[\${period}])\`;

// Get time series data
const rangeQuery = {
  query: \`iot_sensor_reading{sensor_id="\${sensorId}", sensor_type="\${type}"}\`,
  start: startDate.toISOString(),
  end: endDate.toISOString(),
  step: '1h' // or '15m', '1d', etc.
};

// Get current value
const instantQuery = {
  query: \`iot_sensor_reading{sensor_id="\${sensorId}", sensor_type="\${type}"}\`,
  time: new Date().toISOString()
};

// Aggregate across multiple sensors
const aggQuery = \`avg(iot_sensor_reading{sensor_type="\${type}"})\`;
`.trim());

console.log('\n\n=== SENSOR TYPES REFERENCE ===');
console.log(`
Temperature sensors (t1-t15):
  - sensor_type: "temperature"
  - Units: °C

Sound sensors (s1-s2):
  - sensor_type: "soundAvg" or "soundPeak"
  - Units: dB

Current clamps (c1-c2):
  - sensor_type: "current_clamp_1" through "current_clamp_4"
  - Units: Amperes

Other available types:
  - humidity (%)
  - light (lux)
  - motion (boolean)
  - vdd (voltage)
  - Bat_V (battery voltage)
`.trim());

console.log('\n=== Done ===');
