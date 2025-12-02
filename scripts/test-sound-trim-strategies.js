/**
 * Test different strategies to handle sound peak spikes
 */

import victoriaMetricsService from './src/services/victoriaMetricsService.js';

async function testTrimStrategies() {
    try {
        console.log('\n=== Sound Peak Filtering Strategies ===\n');

        // Strategy 1: Use quantile to get 95th percentile (filters top 5% outliers)
        console.log('1. Using quantile (95th percentile - filters top 5% outliers):');
        const quantileQuery = 'quantile(0.95, max_over_time(iot_sensor_reading{sensor_type="soundPeak"}[7d]))';
        const quantileResult = await victoriaMetricsService.query(quantileQuery, { source: 'external' });
        const quantilePeak = parseFloat(quantileResult.data?.result?.[0]?.values?.[0] || 0);
        console.log(`   95th percentile peak: ${quantilePeak} dB\n`);

        // Strategy 2: Exclude specific sensors with 100 dB ceiling
        console.log('2. Excluding sensors hitting 100 dB ceiling:');
        const excludeQuery = 'max(max_over_time(iot_sensor_reading{sensor_type="soundPeak", sensor_name!~"s7|s8"}[7d]))';
        const excludeResult = await victoriaMetricsService.query(excludeQuery, { source: 'external' });
        const excludePeak = parseFloat(excludeResult.data?.result?.[0]?.values?.[0] || 0);
        console.log(`   Max peak (without s7, s8): ${excludePeak} dB\n`);

        // Strategy 3: Use avg instead of max for peak (more resistant to spikes)
        console.log('3. Using average of peak readings (more resistant to spikes):');
        const avgOfPeaksQuery = 'avg(max_over_time(iot_sensor_reading{sensor_type="soundPeak"}[7d]))';
        const avgOfPeaksResult = await victoriaMetricsService.query(avgOfPeaksQuery, { source: 'external' });
        const avgOfPeaks = parseFloat(avgOfPeaksResult.data?.result?.[0]?.values?.[0] || 0);
        console.log(`   Average of sensor peaks: ${avgOfPeaks.toFixed(2)} dB\n`);

        // Strategy 4: Limit to reasonable max (e.g., 95 dB for indoor environment)
        console.log('4. Using clamp_max to limit unrealistic values:');
        const clampQuery = 'max(clamp_max(max_over_time(iot_sensor_reading{sensor_type="soundPeak"}[7d]), 95))';
        const clampResult = await victoriaMetricsService.query(clampQuery, { source: 'external' });
        const clampPeak = parseFloat(clampResult.data?.result?.[0]?.values?.[0] || 0);
        console.log(`   Max peak (clamped at 95 dB): ${clampPeak} dB\n`);

        // Get current avg sound for context
        const avgSoundQuery = 'avg(avg_over_time(iot_sensor_reading{sensor_type="soundAvg"}[7d]))';
        const avgSoundResult = await victoriaMetricsService.query(avgSoundQuery, { source: 'external' });
        const avgSound = parseFloat(avgSoundResult.data?.result?.[0]?.values?.[0] || 0);

        console.log('=== Recommendations ===');
        console.log(`Current average sound level: ${avgSound.toFixed(2)} dB`);
        console.log(`\nPeak filtering options:`);
        console.log(`  • Quantile (95th percentile): ${quantilePeak} dB - filters extreme outliers`);
        console.log(`  • Exclude s7/s8: ${excludePeak} dB - removes sensors hitting ceiling`);
        console.log(`  • Average of peaks: ${avgOfPeaks.toFixed(2)} dB - more stable, less affected by spikes`);
        console.log(`  • Clamp max at 95 dB: ${clampPeak} dB - caps unrealistic values`);

        console.log('\n💡 Recommended approach:');
        if (quantilePeak < 98) {
            console.log('   Use quantile(0.95, ...) to filter top 5% outliers');
            console.log('   This gives a more realistic peak while handling noise spikes.');
        } else {
            console.log('   Use clamp_max(..., 95) to cap unrealistic ceiling values');
            console.log('   Indoor environments rarely exceed 95 dB.');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testTrimStrategies();
