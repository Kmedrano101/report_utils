/**
 * Test active sensor count - detailed
 */

const VM_URL = 'https://api.iot.tidop.es/v1/vm';
const VM_TOKEN = 'bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw';

async function testActiveSensors() {
    console.log('Testing active sensor count...\n');

    try {
        // List all sensors with data in last 1h (without count)
        console.log('1. List sensors with data in last 1h:');
        const listResponse = await fetch(`${VM_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${VM_TOKEN}`
            },
            body: JSON.stringify({
                query: 'count by (sensor_name) (iot_sensor_reading{sensor_name=~"t[1-9]|t[12][0-9]|t30|s[1-7]|c[12]"}[1h])',
                time: new Date().toISOString()
            })
        });
        const listData = await listResponse.json();
        const activeSensorNames = listData.result?.map(r => r.metric.sensor_name).sort() || [];
        console.log('Active sensor names:', activeSensorNames);
        console.log('Active count:', activeSensorNames.length);

        // Compare with total sensors
        console.log('\n2. Total sensors (all time):');
        const totalResponse = await fetch(`${VM_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${VM_TOKEN}`
            },
            body: JSON.stringify({
                query: 'count by (sensor_name) (iot_sensor_reading{sensor_name=~"t[1-9]|t[12][0-9]|t30|s[1-7]|c[12]"})',
                time: new Date().toISOString()
            })
        });
        const totalData = await totalResponse.json();
        const totalSensorNames = totalData.result?.map(r => r.metric.sensor_name).sort() || [];
        console.log('Total sensor names:', totalSensorNames);
        console.log('Total count:', totalSensorNames.length);

        console.log('\n3. Offline sensors:');
        const offlineSensors = totalSensorNames.filter(name => !activeSensorNames.includes(name));
        console.log('Offline:', offlineSensors);
        console.log('Offline count:', offlineSensors.length);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testActiveSensors();
