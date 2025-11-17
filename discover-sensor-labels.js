/**
 * Discover all labels/instances in iot_sensor_reading metric
 * and map sensors to s1-s8, t1-t30, c1-c2 naming convention
 */

const url = 'https://api.iot.tidop.es/v1/vm/query';
const baseUrl = 'https://api.iot.tidop.es/v1/vm';

const options = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        authorization: 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    }
};

console.log('=== Discovering VictoriaMetrics Labels ===\n');

// Get all available labels
console.log('1. Getting all available labels in iot_sensor_reading metric...');
try {
    const labelResponse = await fetch(`${baseUrl}/api/v1/labels`, {
        headers: options.headers
    });
    const labelData = await labelResponse.json();

    if (labelData.status === 'success' && labelData.data) {
        console.log('✓ Available labels:', labelData.data.join(', '));
        const hasSensorName = labelData.data.includes('sensor_name');
        console.log(`\n✓ sensor_name label is ${hasSensorName ? 'AVAILABLE ✓' : 'NOT AVAILABLE ✗'}`);
    }
} catch (error) {
    console.error('✗ Error getting labels:', error.message);
}

// Get all unique sensors grouped by sensor_name, sensor_type, and sensor_id
console.log('\n2. Getting sensors grouped by sensor_name, sensor_id, sensor_type...');
const queryOptions = {
    ...options,
    body: JSON.stringify({
        query: 'group by (sensor_name, sensor_id, sensor_type, sensor_model) (iot_sensor_reading)',
        time: new Date().toISOString()
    })
};

try {
    const response = await fetch(url, queryOptions);
    const data = await response.json();

    if (data.status === 'OK' && data.result?.length > 0) {
        console.log(`✓ Found ${data.result.length} unique sensor/type combinations\n`);

        // Collect all unique sensors with their names
        const sensorsMap = new Map();

        data.result.forEach(item => {
            const sensorName = item.metric.sensor_name;
            const sensorId = item.metric.sensor_id;
            const sensorType = item.metric.sensor_type;
            const sensorModel = item.metric.sensor_model;

            if (!sensorsMap.has(sensorId)) {
                sensorsMap.set(sensorId, {
                    name: sensorName,
                    id: sensorId,
                    model: sensorModel,
                    types: []
                });
            }

            if (!sensorsMap.get(sensorId).types.includes(sensorType)) {
                sensorsMap.get(sensorId).types.push(sensorType);
            }
        });

        console.log(`✓ Found ${sensorsMap.size} unique physical sensors\n`);

        // Categorize sensors by their sensor_name prefix
        const categorized = {
            temperature: [],
            sound: [],
            clamp: []
        };

        sensorsMap.forEach(sensor => {
            if (sensor.name?.startsWith('t')) {
                categorized.temperature.push(sensor);
            } else if (sensor.name?.startsWith('s')) {
                categorized.sound.push(sensor);
            } else if (sensor.name?.startsWith('c')) {
                categorized.clamp.push(sensor);
            }
        });

        // Sort each category by sensor_name number
        const sortByName = (a, b) => {
            const numA = parseInt(a.name?.replace(/[^0-9]/g, '') || '0');
            const numB = parseInt(b.name?.replace(/[^0-9]/g, '') || '0');
            return numA - numB;
        };

        categorized.temperature.sort(sortByName);
        categorized.sound.sort(sortByName);
        categorized.clamp.sort(sortByName);

        console.log('=== SENSOR MAPPING (with sensor_name) ===\n');

        console.log('Temperature Sensors:');
        categorized.temperature.forEach(sensor => {
            console.log(`  ${sensor.name}: ${sensor.id} (${sensor.model}) - ${sensor.types.join(', ')}`);
        });

        console.log('\nSound Sensors:');
        categorized.sound.forEach(sensor => {
            console.log(`  ${sensor.name}: ${sensor.id} (${sensor.model}) - ${sensor.types.join(', ')}`);
        });

        console.log('\nCurrent Clamp Sensors:');
        categorized.clamp.forEach(sensor => {
            console.log(`  ${sensor.name}: ${sensor.id} (${sensor.model}) - ${sensor.types.join(', ')}`);
        });

        // Generate mapping file
        const mapping = {
            temperature: {},
            sound: {},
            clamp: {}
        };

        categorized.temperature.forEach(s => {
            mapping.temperature[s.name] = s.id;
        });

        categorized.sound.forEach(s => {
            mapping.sound[s.name] = s.id;
        });

        categorized.clamp.forEach(s => {
            mapping.clamp[s.name] = s.id;
        });

        console.log('\n=== JSON MAPPING ===');
        console.log(JSON.stringify(mapping, null, 2));

        // Example query
        console.log('\n=== EXAMPLE QUERIES (using sensor_name) ===');
        const firstTempName = Object.keys(mapping.temperature)[0];
        const firstSoundName = Object.keys(mapping.sound)[0];
        const firstClampName = Object.keys(mapping.clamp)[0];

        if (firstTempName) {
            console.log(`
Temperature query using sensor_name="${firstTempName}":
  avg_over_time(iot_sensor_reading{sensor_name="${firstTempName}", sensor_type="temperature"}[20d])
            `.trim());
        }

        if (firstSoundName) {
            console.log(`
Sound query using sensor_name="${firstSoundName}":
  avg_over_time(iot_sensor_reading{sensor_name="${firstSoundName}", sensor_type="soundAvg"}[24h])
            `.trim());
        }

        if (firstClampName) {
            console.log(`
Current query using sensor_name="${firstClampName}":
  iot_sensor_reading{sensor_name="${firstClampName}", sensor_type="current_clamp_1"}
            `.trim());
        }

        console.log(`
\nNOTE: You can now use either sensor_name or sensor_id in queries!
- sensor_name: Easier to use (e.g., "t1", "s1", "c1")
- sensor_id: Device-specific (e.g., "lite-a81758fffe0d2d67")
        `.trim());

    } else {
        console.log('✗ No data found');
    }
} catch (error) {
    console.error('✗ Error:', error.message);
}

console.log('\n=== Done ===');
