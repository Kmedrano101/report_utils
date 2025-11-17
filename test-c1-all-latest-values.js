/**
 * Test query to get ALL LATEST values for sensor c1 (current clamp)
 */

const url = 'https://api.iot.tidop.es/v1/vm/query';

const options = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        authorization: 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    },
    body: JSON.stringify({
        query: 'iot_sensor_reading{sensor_name="c1"}'
    })
};

console.log('=== Getting ALL LATEST values for sensor c1 ===\n');
console.log('Query: iot_sensor_reading{sensor_name="c1"}');
console.log('Time: (not specified - gets latest values)');
console.log('');

try {
    const response = await fetch(url, options);
    const data = await response.json();

    console.log('Status:', data.status);
    console.log('Result count:', data.result?.length || 0);
    console.log('');

    if (data.status === 'OK' && data.result?.length > 0) {
        console.log('✓ SUCCESS!\n');
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║     LATEST VALUES FOR SENSOR c1 (Current Clamp)        ║');
        console.log('╠════════════════════════════════════════════════════════╣');

        // Group by timestamp to show all readings from same time
        const readings = data.result.map(item => ({
            type: item.metric.sensor_type,
            value: item.values[0],
            timestamp: item.timestamps[0],
            sensorId: item.metric.sensor_id,
            sensorModel: item.metric.sensor_model
        }));

        // Get the most recent timestamp
        const latestTimestamp = Math.max(...readings.map(r => r.timestamp));
        const latestTime = new Date(latestTimestamp);

        console.log(`║  Timestamp: ${latestTime.toISOString()}`.padEnd(57) + '║');
        console.log(`║  Local time: ${latestTime.toLocaleString()}`.padEnd(57) + '║');
        console.log('╠════════════════════════════════════════════════════════╣');

        // Display all readings
        readings.forEach(reading => {
            const unit = reading.type.includes('clamp') ? 'A' : 'V';
            const displayType = reading.type.padEnd(18);
            const displayValue = `${reading.value}${unit}`.padEnd(12);
            console.log(`║  ${displayType} : ${displayValue}                 ║`);
        });

        console.log('╚════════════════════════════════════════════════════════╝');

        console.log('\nSensor Details:');
        console.log('  Sensor ID:', readings[0].sensorId);
        console.log('  Sensor Name: c1');
        console.log('  Sensor Model:', readings[0].sensorModel || 'current sensor');

        console.log('\n=== Detailed Breakdown ===\n');
        readings.forEach((reading, index) => {
            console.log(`[${index + 1}] ${reading.type}`);
            const unit = reading.type.includes('clamp') ? 'A (Amperes)' : 'V (Volts)';
            console.log(`    Value: ${reading.value} ${unit}`);
            console.log(`    Timestamp: ${new Date(reading.timestamp).toISOString()}`);
            console.log('');
        });

        console.log('=== Summary Table ===\n');
        console.log('Sensor Type         | Value      | Unit');
        console.log('--------------------|------------|-------');
        readings.forEach(reading => {
            const type = reading.type.padEnd(19);
            const value = reading.value.toString().padEnd(10);
            const unit = reading.type.includes('clamp') ? 'A' : 'V';
            console.log(`${type} | ${value} | ${unit}`);
        });

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
To get ALL latest values for a sensor, use:

{
    method: 'POST',
    url: 'https://api.iot.tidop.es/v1/vm/query',
    headers: {
        'content-type': 'application/json',
        'authorization': 'Basic [token]'
    },
    body: {
        query: 'iot_sensor_reading{sensor_name="c1"}'
        // No sensor_type filter = gets all sensor types
        // No time parameter = gets latest values
    }
}

Current Clamp Sensors provide 5 values:
- current_clamp_1 (A) - Channel 1 current
- current_clamp_2 (A) - Channel 2 current
- current_clamp_3 (A) - Channel 3 current
- current_clamp_4 (A) - Channel 4 current
- Bat_V (V) - Battery voltage
`);

console.log('\n=== Done ===');
