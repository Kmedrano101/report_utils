/**
 * Test script to verify temperature comfort metrics calculation
 */

import dotenv from 'dotenv';
import reportMetricsService from './src/services/reportMetricsService.js';
import victoriaMetricsService from './src/services/victoriaMetricsService.js';

dotenv.config();

async function testMetrics() {
  try {
    console.log('Testing Temperature Comfort Metrics...\n');

    const startDate = '2025-12-10T00:00:00Z';
    const endDate = '2025-12-11T00:00:00Z';
    const source = 'external';

    console.log(`Date Range: ${startDate} to ${endDate}`);
    console.log(`Source: ${source}\n`);

    // Get temperature comfort metrics
    const metrics = await reportMetricsService.getTemperatureComfortMetrics(
      startDate,
      endDate,
      source
    );

    console.log('='.repeat(60));
    console.log('TEMPERATURE COMFORT METRICS');
    console.log('='.repeat(60));
    console.log('');

    console.log('📊 Percentages:');
    console.log(`  - Comfort Zone (20-26°C): ${metrics.comfort_percentage}%`);
    console.log(`  - Cold Zone (<20°C):      ${metrics.cold_percentage}%`);
    console.log(`  - Hot Zone (>26°C):       ${metrics.hot_percentage}%`);
    console.log(`  - Critical (out of range): ${metrics.critical_percentage}%`);
    console.log('');

    console.log('🍩 Donut Chart Arc Lengths (circumference: 198):');
    console.log(`  - Cold Arc Length:    ${metrics.cold_arc_length}`);
    console.log(`  - Comfort Arc Length: ${metrics.comfort_arc_length}`);
    console.log(`  - Hot Arc Length:     ${metrics.hot_arc_length}`);
    console.log('');

    console.log('📍 Donut Chart Arc Offsets:');
    console.log(`  - Comfort Arc Offset: ${metrics.comfort_arc_offset}`);
    console.log(`  - Hot Arc Offset:     ${metrics.hot_arc_offset}`);
    console.log('');

    console.log('📏 Progress Bar Dimensions (Portrait):');
    console.log(`  - Cold Bar Width:    ${metrics.cold_bar_width_portrait}px`);
    console.log(`  - Comfort Bar Width: ${metrics.comfort_bar_width_portrait}px`);
    console.log(`  - Hot Bar Width:     ${metrics.hot_bar_width_portrait}px`);
    console.log('');

    console.log('🎯 Status:');
    console.log(`  - Color: ${metrics.comfort_status_color}`);
    console.log(`  - Text:  ${metrics.comfort_status_text}`);
    console.log('');

    console.log('='.repeat(60));
    console.log('✅ Test completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testMetrics();
