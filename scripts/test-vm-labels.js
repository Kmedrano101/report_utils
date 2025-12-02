/**
 * Test VictoriaMetrics - Check available labels and values
 */

const url = 'https://api.iot.tidop.es/v1/vm/query';

const options = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        authorization: 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    }
};

async function testQuery(query, description) {
    console.log(`\n${description}`);
    console.log('Query:', query);

    const testOptions = {
        ...options,
        body: JSON.stringify({
            query: query,
            time: new Date().toISOString()
        })
    };

    try {
        const response = await fetch(url, testOptions);
        const data = await response.json();

        if (data.status === 'OK' && data.result?.length > 0) {
            console.log('✓ Found', data.result.length, 'results');
            // Show first few results
            data.result.slice(0, 3).forEach((item, i) => {
                console.log(`  [${i}]:`, JSON.stringify(item.metric || item, null, 2));
            });
            if (data.result.length > 3) {
                console.log(`  ... and ${data.result.length - 3} more`);
            }
        } else {
            console.log('✗ No results');
        }
    } catch (error) {
        console.error('✗ Error:', error.message);
    }
}

console.log('=== VictoriaMetrics Label Discovery ===\n');

// Test queries
await testQuery('iot_sensor_reading', '1. Get any iot_sensor_reading (limit 3)');
await testQuery('iot_sensor_reading{sensor_name="s1"}', '2. Check if sensor_name="s1" exists');
await testQuery('iot_sensor_reading{sensor_type=~".*"}', '3. All sensor_type values');
await testQuery('iot_sensor_reading{sensor_name=~"s.*"}', '4. Sensors starting with "s"');

console.log('\n=== Done ===');
