/**
 * Complete sensor mapping including ALL available sensors
 * Get s1-s8, t1-t30, c1-c2
 */

const url = 'https://api.iot.tidop.es/v1/vm/query';

const options = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        authorization: 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    },
    body: JSON.stringify({
        query: 'iot_sensor_reading',
        time: new Date().toISOString()
    })
};

console.log('=== Complete Sensor Discovery ===\n');

try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (data.status === 'OK' && data.result?.length > 0) {
        console.log(`✓ Found ${data.result.length} metric series\n`);

        // Extract all unique sensors and their types
        const sensorsMap = new Map();

        data.result.forEach(item => {
            const sensorId = item.metric.sensor_id;
            const sensorType = item.metric.sensor_type;
            const sensorModel = item.metric.sensor_model || 'unknown';

            if (!sensorsMap.has(sensorId)) {
                sensorsMap.set(sensorId, {
                    id: sensorId,
                    model: sensorModel,
                    types: []
                });
            }

            if (!sensorsMap.get(sensorId).types.includes(sensorType)) {
                sensorsMap.get(sensorId).types.push(sensorType);
            }
        });

        console.log(`\n✓ Found ${sensorsMap.size} unique physical sensors\n`);

        // Categorize sensors
        const categorized = {
            lite: [],     // Multi-sensor (temp, humidity, light)
            sound: [],    // Sound sensors
            clamp: []     // Current clamp sensors
        };

        sensorsMap.forEach((sensor, id) => {
            if (id.startsWith('lite-')) {
                categorized.lite.push(sensor);
            } else if (id.startsWith('sound-')) {
                categorized.sound.push(sensor);
            } else if (id.startsWith('cs01-')) {
                categorized.clamp.push(sensor);
            }
        });

        // Create final mapping
        const mapping = {
            temperature: {},  // t1-t30 (all sensors with temperature)
            sound: {},        // s1-s8 (sound sensors)
            clamp: {}         // c1-c2 (current clamps)
        };

        console.log('=== SENSOR MAPPING ===\n');

        // All sensors with temperature capability (lite + sound)
        console.log('Temperature Sensors (t1-t30):');
        const allTempSensors = [...categorized.lite, ...categorized.sound]
            .filter(s => s.types.includes('temperature'))
            .sort((a, b) => a.id.localeCompare(b.id));

        allTempSensors.forEach((sensor, i) => {
            const key = `t${i + 1}`;
            mapping.temperature[key] = sensor.id;
            console.log(`  ${key}: ${sensor.id} (${sensor.model}) - ${sensor.types.join(', ')}`);
        });

        // Sound sensors
        console.log('\nSound Sensors (s1-s8):');
        categorized.sound
            .filter(s => s.types.some(t => t.includes('sound')))
            .sort((a, b) => a.id.localeCompare(b.id))
            .forEach((sensor, i) => {
                const key = `s${i + 1}`;
                mapping.sound[key] = sensor.id;
                console.log(`  ${key}: ${sensor.id} (${sensor.model}) - ${sensor.types.join(', ')}`);
            });

        // Current clamp sensors
        console.log('\nCurrent Clamp Sensors (c1-c2):');
        categorized.clamp
            .sort((a, b) => a.id.localeCompare(b.id))
            .forEach((sensor, i) => {
                const key = `c${i + 1}`;
                mapping.clamp[key] = sensor.id;
                console.log(`  ${key}: ${sensor.id} (${sensor.model}) - ${sensor.types.join(', ')}`);
            });

        // Save mapping to file
        const fs = await import('fs/promises');
        await fs.writeFile(
            './sensor-mapping.json',
            JSON.stringify(mapping, null, 2)
        );

        console.log('\n=== MAPPING SAVED ===');
        console.log('✓ Mapping saved to: sensor-mapping.json');

        console.log('\n=== SUMMARY ===');
        console.log(`Temperature sensors: ${Object.keys(mapping.temperature).length} (t1-t${Object.keys(mapping.temperature).length})`);
        console.log(`Sound sensors: ${Object.keys(mapping.sound).length} (s1-s${Object.keys(mapping.sound).length})`);
        console.log(`Clamp sensors: ${Object.keys(mapping.clamp).length} (c1-c${Object.keys(mapping.clamp).length})`);

        console.log('\n=== EXAMPLE QUERIES ===');
        console.log(`
// Temperature for t1 (last 20 days average)
{
  query: 'avg_over_time(iot_sensor_reading{sensor_id="${mapping.temperature.t1}", sensor_type="temperature"}[20d])',
  time: new Date().toISOString()
}

// Sound level for s1 (last 7 days)
{
  query: 'iot_sensor_reading{sensor_id="${mapping.sound.s1 || 'N/A'}", sensor_type="soundAvg"}',
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  end: new Date().toISOString(),
  step: '1h'
}

// Current for c1 (last 24 hours)
{
  query: 'iot_sensor_reading{sensor_id="${mapping.clamp.c1}", sensor_type="current_clamp_1"}',
  start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  end: new Date().toISOString(),
  step: '15m'
}
        `.trim());

    } else {
        console.log('✗ No data found');
    }
} catch (error) {
    console.error('✗ Error:', error.message);
}

console.log('\n=== Done ===');
