/**
 * Test VictoriaMetrics - Get unique sensor_type and sensor_id values
 */

const url = 'https://api.iot.tidop.es/v1/vm/query';

const options = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        authorization: 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    }
};

async function getUniqueValues(label) {
    console.log(`\nGetting unique values for label: ${label}`);

    const testOptions = {
        ...options,
        body: JSON.stringify({
            query: `group by (${label}) (iot_sensor_reading)`,
            time: new Date().toISOString()
        })
    };

    try {
        const response = await fetch(url, testOptions);
        const data = await response.json();

        if (data.status === 'OK' && data.result?.length > 0) {
            console.log(`✓ Found ${data.result.length} unique ${label} values:`);
            const values = data.result.map(r => r.metric[label]).filter(Boolean);
            values.forEach((val, i) => {
                console.log(`  ${i + 1}. ${val}`);
            });
            return values;
        } else {
            console.log('✗ No results');
            return [];
        }
    } catch (error) {
        console.error('✗ Error:', error.message);
        return [];
    }
}

async function testTemperatureQuery(sensorId) {
    console.log(`\n\nTesting temperature query for sensor: ${sensorId}`);

    const testOptions = {
        ...options,
        body: JSON.stringify({
            query: `avg_over_time(iot_sensor_reading{sensor_id="${sensorId}", sensor_type=~".*[Tt]emp.*"}[20d])`,
            time: new Date().toISOString()
        })
    };

    try {
        const response = await fetch(url, testOptions);
        const data = await response.json();

        if (data.status === 'OK' && data.result?.length > 0) {
            const avgTemp = data.result[0].value[1];
            console.log('✓ SUCCESS!');
            console.log(`Average Temperature: ${avgTemp}°C`);
            console.log('Full result:', JSON.stringify(data.result[0], null, 2));
        } else {
            console.log('✗ No temperature data found');
        }
    } catch (error) {
        console.error('✗ Error:', error.message);
    }
}

console.log('=== VictoriaMetrics Sensor Analysis ===');

// Get unique sensor types
const sensorTypes = await getUniqueValues('sensor_type');

// Get unique sensor IDs
const sensorIds = await getUniqueValues('sensor_id');

// Try to query temperature for first sensor
if (sensorIds.length > 0) {
    await testTemperatureQuery(sensorIds[0]);
}

console.log('\n=== Done ===');
