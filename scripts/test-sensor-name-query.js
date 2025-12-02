/**
 * Test queries using sensor_name instead of sensor_id
 */

const url = 'https://api.iot.tidop.es/v1/vm/query';

const options = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        authorization: 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    }
};

async function testQuery(sensorName, sensorType, description) {
    console.log(`\n${description}`);
    console.log(`Query: sensor_name="${sensorName}", sensor_type="${sensorType}"`);

    const testOptions = {
        ...options,
        body: JSON.stringify({
            query: `avg_over_time(iot_sensor_reading{sensor_name="${sensorName}", sensor_type="${sensorType}"}[7d])`,
            time: new Date().toISOString()
        })
    };

    try {
        const response = await fetch(url, testOptions);
        const data = await response.json();

        console.log('Response status:', data.status);
        console.log('Result count:', data.result?.length || 0);

        if (data.status === 'OK' && data.result?.length > 0) {
            console.log('Full result:', JSON.stringify(data.result[0], null, 2));
            const value = data.result[0].value?.[1] || data.result[0].values?.[0]?.[1];
            if (value) {
                console.log(`✓ SUCCESS! Average value (7 days): ${value}`);
            }
        } else {
            console.log('✗ No results found');
            console.log('Full response:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('✗ Error:', error.message);
    }
}

console.log('=== Testing sensor_name Queries ===\n');

// Test temperature sensor
await testQuery('t1', 'temperature', '1. Temperature for t1 (7 day average)');

// Test sound sensor
await testQuery('s2', 'soundAvg', '2. Sound level for s2 (7 day average)');

// Test current clamp
await testQuery('c1', 'current_clamp_1', '3. Current clamp 1 for c1 (7 day average)');

console.log('\n=== All Tests Complete ===');
