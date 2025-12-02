/**
 * Get ALL temperature sensors including missing ones (t16-t30)
 */

const url = 'https://api.iot.tidop.es/v1/vm/query';

const options = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        authorization: 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    },
    body: JSON.stringify({
        query: 'group by (sensor_id, sensor_model) (iot_sensor_reading{sensor_type="temperature"})',
        time: new Date().toISOString()
    })
};

console.log('=== Discovering ALL Temperature Sensors ===\n');

try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (data.status === 'OK' && data.result?.length > 0) {
        console.log(`✓ Found ${data.result.length} sensors with temperature capability\n`);

        // Sort sensors by ID
        const sensors = data.result
            .map(item => ({
                id: item.metric.sensor_id,
                model: item.metric.sensor_model || 'unknown'
            }))
            .sort((a, b) => a.id.localeCompare(b.id));

        console.log('=== ALL TEMPERATURE SENSORS ===\n');

        // Create complete t1-tN mapping
        const mapping = {};
        sensors.forEach((sensor, i) => {
            const key = `t${i + 1}`;
            mapping[key] = sensor.id;
            console.log(`${key.padEnd(4)} → ${sensor.id.padEnd(30)} (${sensor.model})`);
        });

        // Save to file
        const fs = await import('fs/promises');

        // Update full mapping
        const fullMapping = {
            temperature: mapping,
            sound: {
                s1: "sound-a81758fffe0d0434",
                s2: "sound-a81758fffe0d0437"
            },
            clamp: {
                c1: "cs01-a840412f375a8bd6",
                c2: "cs01-a84041e9eb5c3996"
            }
        };

        await fs.writeFile(
            './docs/sensor-mapping.json',
            JSON.stringify(fullMapping, null, 2)
        );

        console.log('\n=== SUMMARY ===');
        console.log(`Total temperature sensors: ${Object.keys(mapping).length}`);
        console.log(`Mapping saved to: ./docs/sensor-mapping.json`);

        // Show which sensors are new (t16+)
        const newSensors = Object.entries(mapping).filter(([key]) => {
            const num = parseInt(key.substring(1));
            return num > 15;
        });

        if (newSensors.length > 0) {
            console.log(`\n=== NEW SENSORS DISCOVERED (t16-t${sensors.length}) ===`);
            newSensors.forEach(([key, id]) => {
                const sensor = sensors.find(s => s.id === id);
                console.log(`${key}: ${id} (${sensor.model})`);
            });
        } else {
            console.log('\n⚠ Only 15 temperature sensors found (t1-t15)');
            console.log('No additional sensors available for t16-t30 range');
        }

        // Show sensor breakdown by model
        console.log('\n=== SENSORS BY MODEL ===');
        const byModel = sensors.reduce((acc, sensor) => {
            if (!acc[sensor.model]) acc[sensor.model] = [];
            acc[sensor.model].push(sensor.id);
            return acc;
        }, {});

        Object.entries(byModel).forEach(([model, ids]) => {
            console.log(`${model}: ${ids.length} sensors`);
        });

    } else {
        console.log('✗ No temperature sensors found');
    }
} catch (error) {
    console.error('✗ Error:', error.message);
}

console.log('\n=== Done ===');
