/**
 * Test script to generate a metrics report with last 7 days data
 * Run: node test-metrics-report.js
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';

const API_BASE = 'http://localhost:3000';

async function testMetricsReport() {
  console.log('🧪 Testing Metrics Report Generation...\n');

  try {
    // Test 1: Fetch metrics data
    console.log('📊 Step 1: Fetching metrics for last 7 days...');

    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const metricsResponse = await fetch(
      `${API_BASE}/api/reports/metrics?startDate=${startDate}&endDate=${endDate}&source=external`
    );

    if (!metricsResponse.ok) {
      throw new Error(`Metrics fetch failed: ${metricsResponse.status} ${metricsResponse.statusText}`);
    }

    const metricsData = await metricsResponse.json();
    console.log('✅ Metrics fetched successfully:');
    console.log(JSON.stringify(metricsData.data, null, 2));
    console.log('');

    // Test 2: Generate horizontal layout PDF
    console.log('📄 Step 2: Generating horizontal layout PDF report...');

    const horizontalResponse = await fetch(`${API_BASE}/api/reports/test-metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        layout: 'horizontal',
        pageSize: 'a4',
        format: 'pdf',
        source: 'external'
      })
    });

    if (!horizontalResponse.ok) {
      const errorText = await horizontalResponse.text();
      throw new Error(`Horizontal PDF generation failed: ${horizontalResponse.status}\n${errorText}`);
    }

    const horizontalPdfBuffer = await horizontalResponse.arrayBuffer();
    const horizontalPath = join(process.cwd(), 'test-metrics-horizontal.pdf');
    await writeFile(horizontalPath, Buffer.from(horizontalPdfBuffer));

    console.log(`✅ Horizontal PDF saved to: ${horizontalPath}`);
    console.log(`   Size: ${(horizontalPdfBuffer.byteLength / 1024).toFixed(2)} KB`);
    console.log('');

    // Test 3: Generate vertical layout PDF
    console.log('📄 Step 3: Generating vertical layout PDF report...');

    const verticalResponse = await fetch(`${API_BASE}/api/reports/test-metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        layout: 'vertical',
        pageSize: 'a4',
        format: 'pdf',
        source: 'external'
      })
    });

    if (!verticalResponse.ok) {
      const errorText = await verticalResponse.text();
      throw new Error(`Vertical PDF generation failed: ${verticalResponse.status}\n${errorText}`);
    }

    const verticalPdfBuffer = await verticalResponse.arrayBuffer();
    const verticalPath = join(process.cwd(), 'test-metrics-vertical.pdf');
    await writeFile(verticalPath, Buffer.from(verticalPdfBuffer));

    console.log(`✅ Vertical PDF saved to: ${verticalPath}`);
    console.log(`   Size: ${(verticalPdfBuffer.byteLength / 1024).toFixed(2)} KB`);
    console.log('');

    // Test 4: Generate HTML preview
    console.log('🌐 Step 4: Generating HTML preview...');

    const htmlResponse = await fetch(`${API_BASE}/api/reports/test-metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        layout: 'horizontal',
        format: 'html',
        source: 'external'
      })
    });

    if (!htmlResponse.ok) {
      const errorText = await htmlResponse.text();
      throw new Error(`HTML generation failed: ${htmlResponse.status}\n${errorText}`);
    }

    const htmlContent = await htmlResponse.text();
    const htmlPath = join(process.cwd(), 'test-metrics-preview.html');
    await writeFile(htmlPath, htmlContent);

    console.log(`✅ HTML preview saved to: ${htmlPath}`);
    console.log('');

    // Summary
    console.log('🎉 All tests passed successfully!\n');
    console.log('📋 Summary:');
    console.log('  ✓ Metrics fetched from VictoriaMetrics');
    console.log('  ✓ Horizontal PDF generated');
    console.log('  ✓ Vertical PDF generated');
    console.log('  ✓ HTML preview generated');
    console.log('');
    console.log('📊 Key Metrics:');
    console.log(`  • Temperature: ${metricsData.data.avg_temperature}°C (${metricsData.data.temp_min}°C - ${metricsData.data.temp_max}°C)`);
    console.log(`  • Humidity: ${metricsData.data.avg_humidity}% (${metricsData.data.humidity_min}% - ${metricsData.data.humidity_max}%)`);
    console.log(`  • Sound: ${metricsData.data.peak_sound} dB peak (avg: ${metricsData.data.avg_sound} dB)`);
    console.log(`  • Power: ${metricsData.data.total_power} kWh (peak: ${metricsData.data.peak_power} A)`);
    console.log(`  • Sensors: ${metricsData.data.active_sensors}/${metricsData.data.total_sensors} active`);
    console.log(`  • Date Range: ${metricsData.data.date_range}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the test
console.log('=' .repeat(70));
console.log('  METRICS REPORT TEST');
console.log('=' .repeat(70));
console.log('');

testMetricsReport().then(() => {
  console.log('');
  console.log('=' .repeat(70));
  process.exit(0);
}).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
