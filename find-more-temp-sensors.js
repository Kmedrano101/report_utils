/**
 * Search for ALL available temperature sensors (looking for up to t30)
 */

const url = 'https://api.iot.tidop.es/v1/vm/query';

const options = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        authorization: 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    }
};

console.log('=== Searching for ALL Available Temperature Sensors ===\n');

// Query 1: Get all unique sensor IDs that have ANY metric
console.log('1. Getting all sensor IDs in database...');
let allSensorsQuery = {
    ...options,
    body: JSON.stringify({
        query: 'group by (sensor_id) (iot_sensor_reading)',
        time: new Date().toISOString()
    })
};

try {
    let response = await fetch(url, allSensorsQuery);
    let data = await response.json();

    if (data.status === 'OK' && data.result?.length > 0) {
        const allSensorIds = data.result.map(r => r.metric.sensor_id).sort();
        console.log(`✓ Found ${allSensorIds.length} total unique sensors in database\n`);

        // Query 2: Get all sensors with temperature
        console.log('2. Filtering for sensors with temperature capability...');
        let tempQuery = {
            ...options,
            body: JSON.stringify({
                query: 'group by (sensor_id, sensor_model) (iot_sensor_reading{sensor_type="temperature"})',
                time: new Date().toISOString()
            })
        };

        response = await fetch(url, tempQuery);
        data = await response.json();

        if (data.status === 'OK' && data.result?.length > 0) {
            const tempSensors = data.result
                .map(item => ({
                    id: item.metric.sensor_id,
                    model: item.metric.sensor_model || 'unknown'
                }))
                .sort((a, b) => a.id.localeCompare(b.id));

            console.log(`✓ Found ${tempSensors.length} sensors with temperature\n`);

            console.log('=== COMPLETE TEMPERATURE SENSOR LIST ===\n');

            // Check if we have enough for t1-t30
            const targetCount = 30;
            const actualCount = tempSensors.length;

            tempSensors.forEach((sensor, i) => {
                const key = `t${i + 1}`;
                console.log(`${key.padEnd(4)} → ${sensor.id.padEnd(30)} (${sensor.model})`);
            });

            console.log('\n=== SUMMARY ===');
            console.log(`Available temperature sensors: ${actualCount}`);
            console.log(`Target range: t1-t30`);

            if (actualCount >= targetCount) {
                console.log(`✓ ENOUGH sensors for full t1-t30 range!`);
            } else {
                console.log(`⚠ Only ${actualCount} sensors available (need ${targetCount - actualCount} more for t1-t30)`);
                console.log(`   Available range: t1-t${actualCount}`);
            }

            // Create mapping
            const mapping = {};
            tempSensors.forEach((sensor, i) => {
                const key = `t${i + 1}`;
                mapping[key] = sensor.id;
            });

            // Save mapping
            const fs = await import('fs/promises');
            const existingMapping = JSON.parse(await fs.readFile('./docs/sensor-mapping.json', 'utf-8'));

            existingMapping.temperature = mapping;

            await fs.writeFile(
                './docs/sensor-mapping.json',
                JSON.stringify(existingMapping, null, 2)
            );

            console.log('\n✓ Mapping updated in: ./docs/sensor-mapping.json');

            // Breakdown by model
            console.log('\n=== SENSORS BY MODEL ===');
            const byModel = tempSensors.reduce((acc, sensor) => {
                if (!acc[sensor.model]) acc[sensor.model] = 0;
                acc[sensor.model]++;
                return acc;
            }, {});

            Object.entries(byModel).forEach(([model, count]) => {
                console.log(`${model.padEnd(20)}: ${count} sensors`);
            });

        } else {
            console.log('✗ No temperature sensors found');
        }

    } else {
        console.log('✗ No sensors found in database');
    }

} catch (error) {
    console.error('✗ Error:', error.message);
}

console.log('\n=== Done ===');
