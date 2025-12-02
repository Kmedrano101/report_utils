/**
 * Complete Query Examples for Victoria Metrics
 * Demonstrating how to get last/current values for sensors
 */

const url = 'https://api.iot.tidop.es/v1/vm/query';
const token = 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw';

console.log('=== Victoria Metrics Complete Query Examples ===\n');

// Example 1: Get ALL sensor types for t1 (temperature, humidity, vdd)
console.log('1. Get ALL current values for sensor t1');
console.log('   Query: iot_sensor_reading{sensor_name="t1"}\n');

try {
    const response1 = await fetch(url, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'authorization': token
        },
        body: JSON.stringify({
            query: 'iot_sensor_reading{sensor_name="t1"}'
        })
    });

    const data1 = await response1.json();

    if (data1.status === 'OK' && data1.result?.length > 0) {
        console.log('   ✓ Results:');
        data1.result.forEach(item => {
            const type = item.metric.sensor_type;
            const value = item.values[0];
            const timestamp = new Date(item.timestamps[0]).toISOString();
            console.log(`     - ${type}: ${value} (at ${timestamp})`);
        });
    }
} catch (error) {
    console.error('   ✗ Error:', error.message);
}

console.log('\n' + '='.repeat(60) + '\n');

// Example 2: Get ONLY temperature for t1
console.log('2. Get ONLY temperature for sensor t1');
console.log('   Query: iot_sensor_reading{sensor_name="t1", sensor_type="temperature"}\n');

try {
    const response2 = await fetch(url, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'authorization': token
        },
        body: JSON.stringify({
            query: 'iot_sensor_reading{sensor_name="t1", sensor_type="temperature"}'
        })
    });

    const data2 = await response2.json();

    if (data2.status === 'OK' && data2.result?.length > 0) {
        const value = data2.result[0].values[0];
        const timestamp = new Date(data2.result[0].timestamps[0]).toISOString();
        console.log(`   ✓ Temperature: ${value}°C (at ${timestamp})`);
    }
} catch (error) {
    console.error('   ✗ Error:', error.message);
}

console.log('\n' + '='.repeat(60) + '\n');

// Example 3: Get ONLY humidity for t1
console.log('3. Get ONLY humidity for sensor t1');
console.log('   Query: iot_sensor_reading{sensor_name="t1", sensor_type="humidity"}\n');

try {
    const response3 = await fetch(url, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'authorization': token
        },
        body: JSON.stringify({
            query: 'iot_sensor_reading{sensor_name="t1", sensor_type="humidity"}'
        })
    });

    const data3 = await response3.json();

    if (data3.status === 'OK' && data3.result?.length > 0) {
        const value = data3.result[0].values[0];
        const timestamp = new Date(data3.result[0].timestamps[0]).toISOString();
        console.log(`   ✓ Humidity: ${value}% (at ${timestamp})`);
    }
} catch (error) {
    console.error('   ✗ Error:', error.message);
}

console.log('\n' + '='.repeat(60) + '\n');

// Example 4: Get ONLY voltage (vdd) for t1
console.log('4. Get ONLY voltage for sensor t1');
console.log('   Query: iot_sensor_reading{sensor_name="t1", sensor_type="vdd"}\n');

try {
    const response4 = await fetch(url, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'authorization': token
        },
        body: JSON.stringify({
            query: 'iot_sensor_reading{sensor_name="t1", sensor_type="vdd"}'
        })
    });

    const data4 = await response4.json();

    if (data4.status === 'OK' && data4.result?.length > 0) {
        const value = data4.result[0].values[0];
        const timestamp = new Date(data4.result[0].timestamps[0]).toISOString();
        console.log(`   ✓ Voltage (VDD): ${value}mV (at ${timestamp})`);
    }
} catch (error) {
    console.error('   ✗ Error:', error.message);
}

console.log('\n' + '='.repeat(60) + '\n');

// Example 5: Get ALL values for sound sensor s2
console.log('5. Get ALL current values for sound sensor s2');
console.log('   Query: iot_sensor_reading{sensor_name="s2"}\n');

try {
    const response5 = await fetch(url, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'authorization': token
        },
        body: JSON.stringify({
            query: 'iot_sensor_reading{sensor_name="s2"}'
        })
    });

    const data5 = await response5.json();

    if (data5.status === 'OK' && data5.result?.length > 0) {
        console.log('   ✓ Results:');
        data5.result.forEach(item => {
            const type = item.metric.sensor_type;
            const value = item.values[0];
            const timestamp = new Date(item.timestamps[0]).toISOString();
            console.log(`     - ${type}: ${value} (at ${timestamp})`);
        });
    }
} catch (error) {
    console.error('   ✗ Error:', error.message);
}

console.log('\n=== Summary ===');
console.log(`
Full Query Structure:
{
    method: 'POST',
    url: 'https://api.iot.tidop.es/v1/vm/query',
    headers: {
        'content-type': 'application/json',
        'authorization': 'Basic [token]'
    },
    body: {
        query: 'iot_sensor_reading{sensor_name="[name]", sensor_type="[type]"}'
    }
}

Available sensor_types by sensor:
- Temperature sensors (t1-t30): temperature, humidity, vdd
- Sound sensors (s2-s7): soundAvg, soundPeak, temperature, humidity, light, motion, vdd
- Current clamps (c1-c2): current_clamp_1, current_clamp_2, current_clamp_3, current_clamp_4, Bat_V
`);

console.log('\n=== Done ===');
