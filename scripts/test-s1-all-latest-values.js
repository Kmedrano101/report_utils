/**
 * Test query to get ALL LATEST values for sensor s1 (sound sensor)
 */

const url = 'https://api.iot.tidop.es/v1/vm/query';

const options = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        authorization: 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw'
    },
    body: JSON.stringify({
        query: 'iot_sensor_reading{sensor_name="s1"}'
    })
};

console.log('=== Getting ALL LATEST values for sensor s1 ===\n');
console.log('Query: iot_sensor_reading{sensor_name="s1"}');
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
        console.log('║     LATEST VALUES FOR SENSOR s1 (Sound Sensor)         ║');
        console.log('╠════════════════════════════════════════════════════════╣');

        // Collect all readings
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
            let unit = '';
            if (reading.type.includes('sound')) unit = 'dB';
            else if (reading.type === 'temperature') unit = '°C';
            else if (reading.type === 'humidity') unit = '%';
            else if (reading.type === 'light') unit = 'lux';
            else if (reading.type === 'motion') unit = '';
            else if (reading.type === 'vdd') unit = 'mV';

            const displayType = reading.type.padEnd(18);
            const displayValue = `${reading.value}${unit}`.padEnd(12);
            console.log(`║  ${displayType} : ${displayValue}                 ║`);
        });

        console.log('╚════════════════════════════════════════════════════════╝');

        console.log('\nSensor Details:');
        console.log('  Sensor ID:', readings[0].sensorId);
        console.log('  Sensor Name: s1');
        console.log('  Sensor Model:', readings[0].sensorModel || 'elsys ers-sound');

        console.log('\n=== Detailed Breakdown ===\n');
        readings.forEach((reading, index) => {
            console.log(`[${index + 1}] ${reading.type}`);
            let unit = '';
            let description = '';

            if (reading.type === 'soundAvg') {
                unit = 'dB (Decibels)';
                description = 'Average sound level';
            } else if (reading.type === 'soundPeak') {
                unit = 'dB (Decibels)';
                description = 'Peak sound level';
            } else if (reading.type === 'temperature') {
                unit = '°C (Celsius)';
                description = 'Ambient temperature';
            } else if (reading.type === 'humidity') {
                unit = '% (Relative Humidity)';
                description = 'Humidity level';
            } else if (reading.type === 'light') {
                unit = 'lux (Light intensity)';
                description = 'Light level';
            } else if (reading.type === 'motion') {
                unit = 'boolean (0=no, 1=yes)';
                description = 'Motion detected';
            } else if (reading.type === 'vdd') {
                unit = 'mV (Millivolts)';
                description = 'Supply voltage';
            }

            console.log(`    Value: ${reading.value} ${unit}`);
            console.log(`    Description: ${description}`);
            console.log(`    Timestamp: ${new Date(reading.timestamp).toISOString()}`);
            console.log('');
        });

        console.log('=== Summary Table ===\n');
        console.log('Sensor Type         | Value      | Unit      | Description');
        console.log('--------------------|------------|-----------|---------------------------');
        readings.forEach(reading => {
            const type = reading.type.padEnd(19);
            const value = reading.value.toString().padEnd(10);
            let unit = '';
            let description = '';

            if (reading.type === 'soundAvg') {
                unit = 'dB'.padEnd(9);
                description = 'Average sound level';
            } else if (reading.type === 'soundPeak') {
                unit = 'dB'.padEnd(9);
                description = 'Peak sound level';
            } else if (reading.type === 'temperature') {
                unit = '°C'.padEnd(9);
                description = 'Ambient temperature';
            } else if (reading.type === 'humidity') {
                unit = '%'.padEnd(9);
                description = 'Relative humidity';
            } else if (reading.type === 'light') {
                unit = 'lux'.padEnd(9);
                description = 'Light intensity';
            } else if (reading.type === 'motion') {
                unit = 'bool'.padEnd(9);
                description = 'Motion detection';
            } else if (reading.type === 'vdd') {
                unit = 'mV'.padEnd(9);
                description = 'Supply voltage';
            }

            console.log(`${type} | ${value} | ${unit} | ${description}`);
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
To get ALL latest values for a sound sensor, use:

{
    method: 'POST',
    url: 'https://api.iot.tidop.es/v1/vm/query',
    headers: {
        'content-type': 'application/json',
        'authorization': 'Basic [token]'
    },
    body: {
        query: 'iot_sensor_reading{sensor_name="s1"}'
        // No sensor_type filter = gets all sensor types
        // No time parameter = gets latest values
    }
}

Sound Sensors (elsys ers-sound) provide 7 values:
- soundAvg (dB) - Average sound level
- soundPeak (dB) - Peak sound level
- temperature (°C) - Ambient temperature
- humidity (%) - Relative humidity
- light (lux) - Light intensity
- motion (boolean) - Motion detection (0=no, 1=yes)
- vdd (mV) - Supply voltage (battery indicator)
`);

console.log('\n=== Done ===');
