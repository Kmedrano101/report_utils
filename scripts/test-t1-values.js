/**
 * Test query to get all values for sensor t1
 */

const url = 'https://api.iot.tidop.es/v1/vm/query';

const options = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        authorization: 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    },
    body: JSON.stringify({
        query: 'iot_sensor_reading{sensor_name="t1"}'
    })
};

console.log('=== Testing query: iot_sensor_reading{sensor_name="t1"} ===\n');

try {
    const response = await fetch(url, options);
    const data = await response.json();

    console.log('Status:', data.status);
    console.log('Result count:', data.result?.length || 0);
    console.log('\n');

    if (data.status === 'OK' && data.result?.length > 0) {
        console.log('All sensor types for t1:\n');

        data.result.forEach((item, index) => {
            const sensorType = item.metric.sensor_type;
            const sensorId = item.metric.sensor_id;
            const sensorModel = item.metric.sensor_model;
            const value = item.values?.[0] || item.value?.[1] || 'N/A';
            const timestamp = item.timestamps?.[0] || item.value?.[0] || 'N/A';

            console.log(`[${index + 1}] ${sensorType}`);
            console.log(`    Sensor ID: ${sensorId}`);
            console.log(`    Model: ${sensorModel}`);
            console.log(`    Current Value: ${value}`);
            console.log(`    Timestamp: ${timestamp ? new Date(timestamp).toISOString() : 'N/A'}`);
            console.log('');
        });

        // Summary table
        console.log('\n=== Summary Table ===\n');
        console.log('Sensor Type       | Value');
        console.log('------------------|------------------');
        data.result.forEach(item => {
            const sensorType = item.metric.sensor_type.padEnd(17);
            const value = (item.values?.[0] || item.value?.[1] || 'N/A').toString().substring(0, 15);
            console.log(`${sensorType} | ${value}`);
        });

        console.log('\n=== Complete JSON Response ===\n');
        console.log(JSON.stringify(data, null, 2));
    } else {
        console.log('No results found');
        console.log('\nFull response:', JSON.stringify(data, null, 2));
    }
} catch (error) {
    console.error('Error:', error.message);
}

console.log('\n=== Done ===');
