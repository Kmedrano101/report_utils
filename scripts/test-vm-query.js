/**
 * Test VictoriaMetrics query to see actual response format
 */

const VM_URL = 'https://api.iot.tidop.es/v1/vm';
const VM_TOKEN = 'bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw';

async function testQuery() {
    console.log('Testing VictoriaMetrics queries...\n');

    try {
        // Test 1: Simple temperature query
        console.log('1. Testing basic temperature query...');
        const tempResponse = await fetch(`${VM_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${VM_TOKEN}`
            },
            body: JSON.stringify({
                query: 'iot_sensor_reading{sensor_type="temperature"}',
                time: new Date().toISOString()
            })
        });

        const tempData = await tempResponse.json();
        console.log('Response:', JSON.stringify(tempData, null, 2));
        console.log(`Result count: ${tempData.data?.result?.length || 0}\n`);

        // Test 2: Avg over time query (7 days)
        console.log('2. Testing avg_over_time query...');
        const avgResponse = await fetch(`${VM_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${VM_TOKEN}`
            },
            body: JSON.stringify({
                query: 'avg_over_time(iot_sensor_reading{sensor_type="temperature"}[7d])',
                time: new Date().toISOString()
            })
        });

        const avgData = await avgResponse.json();
        console.log('Response:', JSON.stringify(avgData, null, 2));
        console.log(`Result count: ${avgData.data?.result?.length || 0}\n`);

        // Test 3: Range query
        console.log('3. Testing range query...');
        const endDate = new Date();
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const rangeResponse = await fetch(`${VM_URL}/query_range`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${VM_TOKEN}`
            },
            body: JSON.stringify({
                query: 'avg(iot_sensor_reading{sensor_type="temperature"})',
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                step: '1h'
            })
        });

        const rangeData = await rangeResponse.json();
        console.log('Response:', JSON.stringify(rangeData, null, 2).substring(0, 500) + '...');
        console.log(`Result count: ${rangeData.data?.result?.length || 0}\n`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testQuery();
