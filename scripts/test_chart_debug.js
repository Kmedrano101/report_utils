/**
 * Debug chart rendering in generated HTML
 */

import dotenv from 'dotenv';
import { writeFile } from 'fs/promises';

dotenv.config();

const API_BASE = 'http://localhost:3000/api';

async function debugChart() {
  try {
    console.log('Debugging chart rendering...\n');

    const url = `${API_BASE}/reports/hotspots-coldzones`;
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    await writeFile('/tmp/debug_chart.html', html);

    // Check for canvas element
    const hasCanvas = html.includes('id="temperature-trends-chart"');
    console.log(`✓ Canvas element in HTML: ${hasCanvas ? 'YES' : 'NO'}`);

    // Check for Chart.js library
    const hasChartJs = html.includes('chart.js') || html.includes('Chart.js');
    console.log(`✓ Chart.js library loaded: ${hasChartJs ? 'YES' : 'NO'}`);

    // Check for trends chart data
    const hasTrendsData = html.includes('trendsChart');
    console.log(`✓ Trends chart data present: ${hasTrendsData ? 'YES' : 'NO'}`);

    // Check for rendering code
    const hasRenderCode = html.includes('temperature-trends-chart');
    console.log(`✓ Chart rendering code: ${hasRenderCode ? 'YES' : 'NO'}`);

    // Extract trends chart data
    const trendsMatch = html.match(/"trendsChart":\{.*?"type":"line"/);
    if (trendsMatch) {
      console.log(`✓ Trends chart type found: line chart`);
    }

    // Check datasets
    const maxTempMatch = html.match(/"label":"🔥 Max Temperature"/);
    const avgTempMatch = html.match(/"label":"📊 Average Temperature"/);
    const minTempMatch = html.match(/"label":"❄️ Min Temperature"/);

    console.log(`\nDatasets:`);
    console.log(`  🔥 Max Temperature: ${maxTempMatch ? 'YES' : 'NO'}`);
    console.log(`  📊 Average Temperature: ${avgTempMatch ? 'YES' : 'NO'}`);
    console.log(`  ❄️ Min Temperature: ${minTempMatch ? 'YES' : 'NO'}`);

    // Check for actual data values (not nulls)
    const dataWithValues = html.match(/"🔥 Max Temperature","data":\[([^\]]+)\]/);
    if (dataWithValues) {
      const firstValues = dataWithValues[1].split(',').slice(0, 3);
      const hasRealData = firstValues.some(v => v !== 'null' && parseFloat(v) > 0);
      console.log(`  Has real data values: ${hasRealData ? 'YES' : 'NO'}`);
      console.log(`  Sample values: ${firstValues.join(', ')}`);
    }

    console.log(`\n✅ HTML saved to /tmp/debug_chart.html`);
    console.log('\nNext steps:');
    console.log('1. Open /tmp/debug_chart.html in a browser');
    console.log('2. Open browser console (F12)');
    console.log('3. Look for any JavaScript errors');
    console.log('4. Check if the chart is visible');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    process.exit(1);
  }
}

debugChart();
