/**
 * Test query to get the LATEST temperature value for t1
 */

const url = 'https://api.iot.tidop.es/v1/vm/query';

const options = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        authorization: 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    },
    body: JSON.stringify({
        query: 'iot_sensor_reading{sensor_name="t1", sensor_type="temperature"}'
    })
};

console.log('=== Getting LATEST temperature value for t1 ===\n');
console.log('Query: iot_sensor_reading{sensor_name="t1", sensor_type="temperature"}');
console.log('Time: (not specified - gets latest value)');
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
        console.log('╔════════════════════════════════════════╗');
        console.log('║  LATEST TEMPERATURE FOR SENSOR t1      ║');
        console.log('╠════════════════════════════════════════╣');
        console.log(`║  Temperature: ${temperature}°C`.padEnd(41) + '║');

        if (timestamp) {
            const readingTime = new Date(timestamp);
            console.log(`║  Timestamp: ${readingTime.toISOString()}`.padEnd(41) + '║');
            console.log(`║  Local time: ${readingTime.toLocaleString()}`.padEnd(41) + '║');

            // Calculate how long ago
            const now = new Date();
            const diffMs = now - readingTime;
            const diffMinutes = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMinutes / 60);
            const diffDays = Math.floor(diffHours / 24);

            let timeAgo = '';
            if (diffDays > 0) {
                timeAgo = `${diffDays} day(s) ago`;
            } else if (diffHours > 0) {
                timeAgo = `${diffHours} hour(s) ago`;
            } else if (diffMinutes > 0) {
                timeAgo = `${diffMinutes} minute(s) ago`;
            } else {
                timeAgo = 'just now';
            }
            console.log(`║  Time ago: ${timeAgo}`.padEnd(41) + '║');
        }

        console.log('╚════════════════════════════════════════╝');

        console.log('\nSensor Details:');
        console.log('  Sensor ID:', result.metric.sensor_id);
        console.log('  Sensor Name:', result.metric.sensor_name);
        console.log('  Sensor Model:', result.metric.sensor_model);

        console.log('\n=== Full JSON Response ===');
        console.log(JSON.stringify(data, null, 2));
    } else {
        console.log('✗ No results found');
        console.log('\nFull response:');
        console.log(JSON.stringify(data, null, 2));
    }
} catch (error) {
    console.error('✗ Error:', error.message);
}

console.log('\n=== Query Structure ===');
console.log(`
To get the LATEST value, use this query WITHOUT the time parameter:

{
    method: 'POST',
    url: 'https://api.iot.tidop.es/v1/vm/query',
    headers: {
        'content-type': 'application/json',
        'authorization': 'Basic [token]'
    },
    body: {
        query: 'iot_sensor_reading{sensor_name="t1", sensor_type="temperature"}'
        // NO 'time' parameter = gets latest value
    }
}
`);

console.log('\n=== Done ===');
