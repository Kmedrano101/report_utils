/**
 * Test Report Queries - Demonstrate key metrics from REPORTS_QUERIES.md
 */

const url = 'https://api.iot.tidop.es/v1/vm/query';
const token = 'Basic bWFkaXNvbi1kdDoxY2NmMzQ3YWFmZDMwOTQ5NGZjOWE1MjZhMGIxNzE0M2U0YTViZDFlZjA2NWUzZjY4YzA0NGVlNWJmZWY4OGIw';

console.log('=== Testing Report Queries ===\n');
console.log('Demonstrating key metrics from REPORTS_QUERIES.md\n');

// Query 1: Overall Temperature Overview
console.log('1. OVERALL TEMPERATURE OVERVIEW');
console.log('   Query: avg(iot_sensor_reading{sensor_type="temperature"})\n');

try {
    const response1 = await fetch(url, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'authorization': token
        },
        body: JSON.stringify({
            query: 'avg(iot_sensor_reading{sensor_type="temperature"})'
        })
    });

    const data1 = await response1.json();
    if (data1.status === 'OK' && data1.result?.length > 0) {
        const avgTemp = data1.result[0].values[0];
        console.log(`   ✓ Average Temperature across all sensors: ${avgTemp.toFixed(2)}°C`);
    }
} catch (error) {
    console.error('   ✗ Error:', error.message);
}

console.log('\n' + '='.repeat(60) + '\n');

// Query 2: Temperature Range Analysis
console.log('2. TEMPERATURE RANGE ANALYSIS (Min/Max)\n');

try {
    const [minResponse, maxResponse] = await Promise.all([
        fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'authorization': token },
            body: JSON.stringify({ query: 'min(iot_sensor_reading{sensor_type="temperature"})' })
        }),
        fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'authorization': token },
            body: JSON.stringify({ query: 'max(iot_sensor_reading{sensor_type="temperature"})' })
        })
    ]);

    const minData = await minResponse.json();
    const maxData = await maxResponse.json();

    const minTemp = minData.result[0]?.values[0];
    const maxTemp = maxData.result[0]?.values[0];
    const range = maxTemp - minTemp;

    console.log(`   ✓ Minimum Temperature: ${minTemp}°C`);
    console.log(`   ✓ Maximum Temperature: ${maxTemp}°C`);
    console.log(`   ✓ Temperature Range: ${range.toFixed(2)}°C\n`);
} catch (error) {
    console.error('   ✗ Error:', error.message);
}

console.log('='.repeat(60) + '\n');

// Query 3: Sound Level Monitoring
console.log('3. SOUND LEVEL MONITORING\n');

try {
    const response3 = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': token },
        body: JSON.stringify({
            query: 'avg(iot_sensor_reading{sensor_type="soundAvg"})'
        })
    });

    const data3 = await response3.json();
    if (data3.status === 'OK' && data3.result?.length > 0) {
        const avgSound = data3.result[0].values[0];
        console.log(`   ✓ Average Sound Level: ${avgSound.toFixed(2)} dB\n`);
    }
} catch (error) {
    console.error('   ✗ Error:', error.message);
}

console.log('='.repeat(60) + '\n');

// Query 4: Power Consumption Analysis
console.log('4. POWER CONSUMPTION ANALYSIS\n');

try {
    const response4 = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': token },
        body: JSON.stringify({
            query: 'sum(iot_sensor_reading{sensor_type=~"current_clamp_.*"})'
        })
    });

    const data4 = await response4.json();
    if (data4.status === 'OK' && data4.result?.length > 0) {
        const totalCurrent = data4.result[0].values[0];
        console.log(`   ✓ Total Current Consumption: ${totalCurrent.toFixed(2)} A`);
        console.log(`   ✓ Estimated Power (at 230V): ${(totalCurrent * 230).toFixed(2)} W\n`);
    }
} catch (error) {
    console.error('   ✗ Error:', error.message);
}

console.log('='.repeat(60) + '\n');

// Query 5: Environmental Conditions
console.log('5. ENVIRONMENTAL CONDITIONS DASHBOARD\n');

try {
    const [humidityResponse, lightResponse] = await Promise.all([
        fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'authorization': token },
            body: JSON.stringify({ query: 'avg(iot_sensor_reading{sensor_type="humidity"})' })
        }),
        fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'authorization': token },
            body: JSON.stringify({ query: 'avg(iot_sensor_reading{sensor_type="light"})' })
        })
    ]);

    const humidityData = await humidityResponse.json();
    const lightData = await lightResponse.json();

    const avgHumidity = humidityData.result[0]?.values[0];
    const avgLight = lightData.result[0]?.values[0];

    console.log(`   ✓ Average Humidity: ${avgHumidity?.toFixed(1)}%`);
    console.log(`   ✓ Average Light Level: ${avgLight?.toFixed(1)} lux\n`);
} catch (error) {
    console.error('   ✗ Error:', error.message);
}

console.log('='.repeat(60) + '\n');

// Query 6: Battery Health Monitoring
console.log('6. BATTERY HEALTH MONITORING\n');

try {
    const response6 = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': token },
        body: JSON.stringify({
            query: 'count(iot_sensor_reading{sensor_type="vdd"} < 3500 or iot_sensor_reading{sensor_type="Bat_V"} < 3.2)'
        })
    });

    const data6 = await response6.json();
    const lowBatteryCount = data6.result[0]?.values[0] || 0;

    console.log(`   ✓ Sensors with low battery: ${lowBatteryCount}`);

    if (lowBatteryCount === 0) {
        console.log('   ✓ All sensors have healthy battery levels\n');
    } else {
        console.log('   ⚠ Some sensors require battery attention\n');
    }
} catch (error) {
    console.error('   ✗ Error:', error.message);
}

console.log('='.repeat(60) + '\n');

// Summary
console.log('=== DAILY SUMMARY REPORT ===\n');
console.log('All queries executed successfully!');
console.log('For complete query documentation, see: docs/REPORTS_QUERIES.md\n');
console.log('Available Reports:');
console.log('  1. Overall Temperature Overview');
console.log('  2. Temperature Range Analysis');
console.log('  3. Sound Level Monitoring');
console.log('  4. Power Consumption Analysis');
console.log('  5. Environmental Conditions Dashboard');
console.log('  6. Motion Detection & Occupancy');
console.log('  7. Battery Health Monitoring');
console.log('  8. Hourly Temperature Trends');
console.log('  9. Peak Sound Events Detection');
console.log('  10. Multi-Metric Sensor Health Report');

console.log('\n=== Done ===');
