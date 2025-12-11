/**
 * Test temperature trends chart generation
 */

import dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'http://localhost:3000/api';

async function testTrendsChart() {
  try {
    console.log('Testing temperature trends chart...\n');

    const url = `${API_BASE}/reports/hotspots-coldzones`;
    console.log(`Posting to: ${url}\n`);

    const body = {
      startDate: '2025-12-10T00:00:00Z',
      endDate: '2025-12-11T00:00:00Z',
      source: 'external',
      format: 'html',
      layout: 'portrait',
      locale: 'en'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Save HTML for debugging
    await import('fs/promises').then(fs => fs.writeFile('/tmp/test_report.html', html));
    console.log('HTML saved to /tmp/test_report.html\n');

    // Check for temperature trends chart canvas
    const hasTrendsCanvas = html.includes('id="temperature-trends-chart"');
    const hasTrendsChartData = html.includes('trendsChart');
    const hasComfortZonePlugin = html.includes('comfortZonePlugin');
    const hasOverallAvgLine = html.includes('Overall Average');

    console.log('Temperature Trends Chart verification:');
    console.log(`  Has trends canvas element: ${hasTrendsCanvas ? '✓' : '✗'}`);
    console.log(`  Has trends chart data: ${hasTrendsChartData ? '✓' : '✗'}`);
    console.log(`  Has comfort zone plugin: ${hasComfortZonePlugin ? '✓' : '✗'}`);
    console.log(`  Has overall average line: ${hasOverallAvgLine ? '✓' : '✗'}\n`);

    // Also check that temperature comparison chart still exists
    const hasComparisonCanvas = html.includes('id="temperature-comparison-chart"');
    const hasComparisonChartData = html.includes('comparisonChart');

    console.log('Temperature Comparison Chart verification:');
    console.log(`  Has comparison canvas element: ${hasComparisonCanvas ? '✓' : '✗'}`);
    console.log(`  Has comparison chart data: ${hasComparisonChartData ? '✓' : '✗'}\n`);

    if (hasTrendsCanvas && hasTrendsChartData && hasComfortZonePlugin && hasOverallAvgLine && hasComparisonCanvas) {
      console.log('============================================================');
      console.log('✅ Temperature trends chart implementation successful!');
      console.log('============================================================');
      console.log('\nYou can view the report at:');
      console.log(url);
    } else {
      console.log('❌ Some checks failed');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testTrendsChart();
