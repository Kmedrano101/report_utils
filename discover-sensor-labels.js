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
    }
} catch (error) {
    console.error('✗ Error getting labels:', error.message);
}

// Get all unique sensors grouped by sensor_type
console.log('\n2. Getting sensors grouped by sensor_type...');
const queryOptions = {
    ...options,
    body: JSON.stringify({
        query: 'group by (sensor_id, sensor_type, sensor_model) (iot_sensor_reading)',
        time: new Date().toISOString()
    })
};

try {
    const response = await fetch(url, queryOptions);
    const data = await response.json();

    if (data.status === 'OK' && data.result?.length > 0) {
        console.log(`✓ Found ${data.result.length} unique sensor/type combinations\n`);

        // Group sensors by type
        const sensorsByType = {
            temperature: [],
            humidity: [],
            light: [],
            motion: [],
            sound: [],
            clamp: [],
            other: []
        };

        data.result.forEach(item => {
            const sensorId = item.metric.sensor_id;
            const sensorType = item.metric.sensor_type;
            const sensorModel = item.metric.sensor_model;

            if (sensorType === 'temperature') {
                sensorsByType.temperature.push({ id: sensorId, model: sensorModel });
            } else if (sensorType === 'humidity') {
                sensorsByType.humidity.push({ id: sensorId, model: sensorModel });
            } else if (sensorType === 'light') {
                sensorsByType.light.push({ id: sensorId, model: sensorModel });
            } else if (sensorType === 'motion') {
                sensorsByType.motion.push({ id: sensorId, model: sensorModel });
            } else if (sensorType.includes('sound')) {
                sensorsByType.sound.push({ id: sensorId, model: sensorModel });
            } else if (sensorType.includes('clamp') || sensorType.includes('current')) {
                sensorsByType.clamp.push({ id: sensorId, model: sensorModel });
            } else {
                sensorsByType.other.push({ id: sensorId, type: sensorType, model: sensorModel });
            }
        });

        // Create mapping for s1-s8 (general/multi sensors), t1-t30 (temperature), c1-c2 (clamps)
        console.log('=== SENSOR MAPPING ===\n');

        // Get unique sensor devices (by removing duplicates based on sensor_id)
        const uniqueSensors = [...new Set(data.result.map(r => r.metric.sensor_id))];

        console.log('Temperature Sensors (t1-t30):');
        const tempSensors = [...new Set(sensorsByType.temperature.map(s => s.id))];
        tempSensors.forEach((id, i) => {
            const model = sensorsByType.temperature.find(s => s.id === id)?.model || 'unknown';
            console.log(`  t${i + 1}: ${id} (${model})`);
        });

        console.log('\nClamp/Current Sensors (c1-c2):');
        const clampSensors = [...new Set(sensorsByType.clamp.map(s => s.id))];
        clampSensors.forEach((id, i) => {
            const model = sensorsByType.clamp.find(s => s.id === id)?.model || 'unknown';
            console.log(`  c${i + 1}: ${id} (${model})`);
        });

        console.log('\nSound Sensors (s1-s8):');
        const soundSensors = [...new Set(sensorsByType.sound.map(s => s.id))];
        soundSensors.forEach((id, i) => {
            const model = sensorsByType.sound.find(s => s.id === id)?.model || 'unknown';
            console.log(`  s${i + 1}: ${id} (${model})`);
        });

        console.log('\nLight Sensors:');
        const lightSensors = [...new Set(sensorsByType.light.map(s => s.id))];
        lightSensors.forEach((id, i) => {
            const model = sensorsByType.light.find(s => s.id === id)?.model || 'unknown';
            console.log(`  l${i + 1}: ${id} (${model})`);
        });

        // Generate mapping file
        const mapping = {
            temperature: tempSensors.reduce((acc, id, i) => {
                acc[`t${i + 1}`] = id;
                return acc;
            }, {}),
            clamp: clampSensors.reduce((acc, id, i) => {
                acc[`c${i + 1}`] = id;
                return acc;
            }, {}),
            sound: soundSensors.reduce((acc, id, i) => {
                acc[`s${i + 1}`] = id;
                return acc;
            }, {}),
            light: lightSensors.reduce((acc, id, i) => {
                acc[`l${i + 1}`] = id;
                return acc;
            }, {})
        };

        console.log('\n=== JSON MAPPING ===');
        console.log(JSON.stringify(mapping, null, 2));

        // Example query
        console.log('\n=== EXAMPLE QUERY (Temperature for t1) ===');
        const t1Id = mapping.temperature.t1;
        if (t1Id) {
            console.log(`
Query for average temperature of t1 (${t1Id}) over last 20 days:

const query = 'avg_over_time(iot_sensor_reading{sensor_id="${t1Id}", sensor_type="temperature"}[20d])';
            `.trim());
        }

    } else {
        console.log('✗ No data found');
    }
} catch (error) {
    console.error('✗ Error:', error.message);
}

console.log('\n=== Done ===');
