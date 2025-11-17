/**
 * Test query to get temperature for t1 at a specific time
 */

const url = 'https://api.iot.tidop.es/v1/vm/query';

const specificTime = '2025-11-04T20:39:33.479Z';

const options = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        authorization: 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    },
    body: JSON.stringify({
        query: 'iot_sensor_reading{sensor_name="t1", sensor_type="temperature"}',
        time: specificTime
    })
};

console.log('=== Testing temperature query for t1 at specific time ===\n');
console.log('Query: iot_sensor_reading{sensor_name="t1", sensor_type="temperature"}');
console.log('Time:', specificTime);
console.log('');

try {
    const response = await fetch(url, options);
    const data = await response.json();

    console.log('Status:', data.status);
    console.log('Result count:', data.result?.length || 0);
    console.log('');

    if (data.status === 'OK' && data.result?.length > 0) {
        const result = data.result[0];
        const temperature = result.values?.[0] || result.value?.[1] || 'N/A';
        const timestamp = result.timestamps?.[0] || result.value?.[0];

        console.log('✓ SUCCESS!\n');
        console.log('Temperature:', temperature + '°C');

        if (timestamp) {
            const readingTime = new Date(timestamp);
            console.log('Reading timestamp:', readingTime.toISOString());
            console.log('Reading timestamp (local):', readingTime.toLocaleString());
        }

        console.log('\nMetric details:');
        console.log('  Sensor ID:', result.metric.sensor_id);
        console.log('  Sensor Name:', result.metric.sensor_name);
        console.log('  Sensor Type:', result.metric.sensor_type);
        console.log('  Sensor Model:', result.metric.sensor_model);

        console.log('\n=== Full JSON Response ===');
        console.log(JSON.stringify(data, null, 2));
    } else {
        console.log('✗ No results found for this time');
        console.log('\nFull response:');
        console.log(JSON.stringify(data, null, 2));
    }
} catch (error) {
    console.error('✗ Error:', error.message);
}

console.log('\n=== Done ===');
