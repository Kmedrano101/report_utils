/**
 * Test sensor count query
 */

const VM_URL = 'https://api.iot.tidop.es/v1/vm';
const VM_TOKEN = 'bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw';

async function testSensorCount() {
    console.log('Testing sensor count queries...\n');

    try {
        // Test 1: All sensors
        console.log('1. All sensors (no filter):');
        const allResponse = await fetch(`${VM_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${VM_TOKEN}`
            },
            body: JSON.stringify({
                query: 'count(count by (sensor_name) (iot_sensor_reading))',
                time: new Date().toISOString()
            })
        });
        const allData = await allResponse.json();
        console.log('Result:', JSON.stringify(allData, null, 2));

        // Test 2: Filtered sensors (t1-t30, s1-s7, c1-c2)
        console.log('\n2. Filtered sensors (t1-t30, s1-s7, c1-c2):');
        const filterResponse = await fetch(`${VM_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${VM_TOKEN}`
            },
            body: JSON.stringify({
                query: 'count(count by (sensor_name) (iot_sensor_reading{sensor_name=~"t[1-9]|t[12][0-9]|t30|s[1-7]|c[12]"}))',
                time: new Date().toISOString()
            })
        });
        const filterData = await filterResponse.json();
        console.log('Result:', JSON.stringify(filterData, null, 2));

        // Test 3: List all unique sensor names
        console.log('\n3. All unique sensor names:');
        const listResponse = await fetch(`${VM_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${VM_TOKEN}`
            },
            body: JSON.stringify({
                query: 'count by (sensor_name) (iot_sensor_reading)',
                time: new Date().toISOString()
            })
        });
        const listData = await listResponse.json();
        const sensorNames = listData.result?.map(r => r.metric.sensor_name).sort() || [];
        console.log('Sensor names:', sensorNames);
        console.log('Total count:', sensorNames.length);

        // Test 4: Active sensors (last 1h) with filter
        console.log('\n4. Active sensors (last 1h) with filter:');
        const activeResponse = await fetch(`${VM_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${VM_TOKEN}`
            },
            body: JSON.stringify({
                query: 'count(count by (sensor_name) (iot_sensor_reading{sensor_name=~"t[1-9]|t[12][0-9]|t30|s[1-7]|c[12]"}[1h]))',
                time: new Date().toISOString()
            })
        });
        const activeData = await activeResponse.json();
        console.log('Result:', JSON.stringify(activeData, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testSensorCount();
