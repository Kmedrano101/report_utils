/**
 * Test VictoriaMetrics - Get average temperature over 20 days
 */

const url = 'https://api.iot.tidop.es/v1/vm/query';

const options = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        authorization: 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    }
};

console.log('=== Testing Temperature Queries ===\n');

// Test 1: Average temperature across all sensors
console.log('1. Average temperature across ALL sensors (20 days)');
let testOptions = {
    ...options,
    body: JSON.stringify({
        query: 'avg_over_time(iot_sensor_reading{sensor_type="temperature"}[20d])',
        time: new Date().toISOString()
    })
};

try {
    let response = await fetch(url, testOptions);
    let data = await response.json();

    if (data.status === 'OK' && data.result?.length > 0) {
        console.log('✓ SUCCESS! Found', data.result.length, 'sensors with temperature data');
        data.result.forEach((item) => {
            const avgTemp = item.values?.[0] || item.value?.[1] || 'N/A';
            const sensorId = item.metric?.sensor_id || 'unknown';
            console.log(`  Sensor ${sensorId}: ${avgTemp}°C (avg over 20 days)`);
        });
    } else {
        console.log('✗ No data found');
    }
} catch (error) {
    console.error('✗ Error:', error.message);
}

// Test 2: Overall average across all temperature sensors
console.log('\n2. Overall average temperature (all sensors combined)');
testOptions = {
    ...options,
    body: JSON.stringify({
        query: 'avg(avg_over_time(iot_sensor_reading{sensor_type="temperature"}[20d]))',
        time: new Date().toISOString()
    })
};

try {
    let response = await fetch(url, testOptions);
    let data = await response.json();

    if (data.status === 'OK' && data.result?.length > 0) {
        const overallAvg = data.result[0].values?.[0] || data.result[0].value?.[1] || 'N/A';
        console.log('✓ SUCCESS!');
        console.log(`  Overall Average Temperature: ${overallAvg}°C`);
    } else {
        console.log('✗ No data found');
    }
} catch (error) {
    console.error('✗ Error:', error.message);
}

// Test 3: Average for a specific sensor
console.log('\n3. Average temperature for specific sensor (lite-a81758fffe0d2d68)');
testOptions = {
    ...options,
    body: JSON.stringify({
        query: 'avg_over_time(iot_sensor_reading{sensor_type="temperature", sensor_id="lite-a81758fffe0d2d68"}[20d])',
        time: new Date().toISOString()
    })
};

try {
    let response = await fetch(url, testOptions);
    let data = await response.json();

    if (data.status === 'OK' && data.result?.length > 0) {
        const avgTemp = data.result[0].values?.[0] || data.result[0].value?.[1] || 'N/A';
        console.log('✓ SUCCESS!');
        console.log(`  Average Temperature: ${avgTemp}°C`);
    } else {
        console.log('✗ No data found');
    }
} catch (error) {
    console.error('✗ Error:', error.message);
}

console.log('\n=== Done ===');
