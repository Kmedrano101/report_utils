/**
 * Test VictoriaMetrics Query - Average Temperature for s1 over 20 days
 */

const url = 'https://api.iot.tidop.es/v1/vm/query';

const options = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        authorization: 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    },
    body: JSON.stringify({
        query: 'avg_over_time(iot_sensor_reading{sensor_name="s1", sensor_type="temperature"}[20d])',
        time: new Date().toISOString()
    })
};

console.log('Testing VictoriaMetrics query for average temperature...');
console.log('Query:', JSON.parse(options.body).query);
console.log('Time:', JSON.parse(options.body).time);
console.log('');

try {
    const response = await fetch(url, options);
    const data = await response.json();

    console.log('Response Status:', response.status);
    console.log('Full Response:', JSON.stringify(data, null, 2));

    if (data.status === 'success' && data.data?.result?.length > 0) {
        const avgTemp = data.data.result[0].value[1];
        console.log('\n✓ SUCCESS!');
        console.log('Average Temperature for sensor s1 over last 20 days:', avgTemp, '°C');
    } else if (data.status === 'error') {
        console.log('\n✗ ERROR:', data.error);
    } else {
        console.log('\n⚠ No data found for sensor s1 with sensor_type="temperature"');
    }
} catch (error) {
    console.error('\n✗ FETCH ERROR:', error.message);
}
