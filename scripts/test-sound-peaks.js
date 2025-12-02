/**
 * Test script to investigate sound sensor peak values
 * Checks if there are noise spikes similar to current clamp sensors
 */

import victoriaMetricsService from './src/services/victoriaMetricsService.js';
import logger from './src/utils/logger.js';

async function testSoundPeaks() {
    try {
        console.log('\n=== Sound Sensor Peak Analysis ===\n');

        // Test 1: Get max sound peak over last 7 days (without trim)
        console.log('1. Maximum sound peak over last 7 days (raw data):');
        const maxPeakQuery = 'max(max_over_time(iot_sensor_reading{sensor_type="soundPeak"}[7d]))';
        const maxResult = await victoriaMetricsService.query(maxPeakQuery, { source: 'external' });
        const maxPeak = parseFloat(maxResult.data?.result?.[0]?.values?.[0] || 0);
        console.log(`   Max Peak: ${maxPeak} dB\n`);

        // Test 2: Get average sound peak over last 7 days
        console.log('2. Average sound peak over last 7 days:');
        const avgPeakQuery = 'avg(max_over_time(iot_sensor_reading{sensor_type="soundPeak"}[7d]))';
        const avgResult = await victoriaMetricsService.query(avgPeakQuery, { source: 'external' });
        const avgPeak = parseFloat(avgResult.data?.result?.[0]?.values?.[0] || 0);
        console.log(`   Avg Peak: ${avgPeak.toFixed(2)} dB\n`);

        // Test 3: Get peak values per sensor
        console.log('3. Peak sound per sensor (last 7 days):');
        const perSensorQuery = 'max_over_time(iot_sensor_reading{sensor_type="soundPeak"}[7d])';
        const perSensorResult = await victoriaMetricsService.query(perSensorQuery, { source: 'external' });

        if (perSensorResult.data?.result) {
            perSensorResult.data.result.forEach(sensor => {
                const sensorName = sensor.metric?.sensor_name || 'unknown';
                const peak = parseFloat(sensor.values?.[0] || 0);
                console.log(`   ${sensorName}: ${peak} dB`);
            });
        }
        console.log();

        // Test 4: Test with range_trim_spikes (various thresholds)
        const thresholds = [5, 10, 15, 20];
        console.log('4. Testing range_trim_spikes with different thresholds:');

        for (const threshold of thresholds) {
            const trimQuery = `max(max_over_time(range_trim_spikes(${threshold}, iot_sensor_reading{sensor_type="soundPeak"})[7d]))`;
            const trimResult = await victoriaMetricsService.query(trimQuery, { source: 'external' });
            const trimPeak = parseFloat(trimResult.data?.result?.[0]?.values?.[0] || 0);
            const reduction = ((maxPeak - trimPeak) / maxPeak * 100).toFixed(1);
            console.log(`   Threshold ${threshold}: ${trimPeak} dB (${reduction}% reduction from raw)`);
        }
        console.log();

        // Test 5: Compare average sound level
        console.log('5. Average sound level (soundAvg) for comparison:');
        const avgSoundQuery = 'avg(avg_over_time(iot_sensor_reading{sensor_type="soundAvg"}[7d]))';
        const avgSoundResult = await victoriaMetricsService.query(avgSoundQuery, { source: 'external' });
        const avgSound = parseFloat(avgSoundResult.data?.result?.[0]?.values?.[0] || 0);
        console.log(`   Avg Sound: ${avgSound.toFixed(2)} dB\n`);

        // Analysis
        console.log('=== Analysis ===');
        console.log(`Raw max peak: ${maxPeak} dB`);
        console.log(`Average of peaks: ${avgPeak.toFixed(2)} dB`);
        console.log(`Average sound level: ${avgSound.toFixed(2)} dB`);

        const peakDiff = maxPeak - avgPeak;
        console.log(`\nDifference between max and avg peaks: ${peakDiff.toFixed(2)} dB`);

        if (maxPeak >= 95 || peakDiff > 20) {
            console.log('\n⚠️  WARNING: Possible noise spikes detected!');
            console.log('   Consider using range_trim_spikes to filter out anomalies.');

            // Suggest threshold
            const suggestedThreshold = Math.ceil(avgPeak * 0.3);
            console.log(`   Suggested threshold: ${suggestedThreshold} dB`);
        } else {
            console.log('\n✓ Sound peaks appear normal (no significant spikes detected)');
        }

    } catch (error) {
        logger.error('Failed to test sound peaks', { error: error.message });
        console.error('Error:', error.message);
    }
}

testSoundPeaks();
