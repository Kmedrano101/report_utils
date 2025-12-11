/**
 * Direct test of temperature trends chart - bypasses API server
 */

import dotenv from 'dotenv';
import userMetricsService from './src/services/userMetricsService.js';
import reportMetricsService from './src/services/reportMetricsService.js';
import svgTemplateService from './src/services/svgTemplateService.js';
import { translateTemplateText } from './src/utils/templateLocalization.js';
import { writeFile } from 'fs/promises';

dotenv.config();

async function testTrendsDirect() {
  try {
    console.log('Testing temperature trends chart directly...\n');

    const startDate = '2025-12-10T00:00:00Z';
    const endDate = '2025-12-11T00:00:00Z';
    const source = 'external';
    const locale = 'en';

    // Get hotspots and cold zones data (includes trends chart)
    const hotspotsData = await userMetricsService.getHotspotsAndColdZones({
      startDate,
      endDate,
      source
    });

    console.log('✓ Hotspots data fetched');
    console.log(`  Has chartData: ${!!hotspotsData.chartData}`);
    console.log(`  Has comparisonChart: ${!!hotspotsData.chartData?.comparisonChart}`);
    console.log(`  Has trendsChart: ${!!hotspotsData.chartData?.trendsChart}`);

    if (hotspotsData.hotspots && hotspotsData.hotspots.length > 0) {
      console.log(`\nTop hotspot: ${hotspotsData.hotspots[0].sensorName} (ID: ${hotspotsData.hotspots[0].sensorId})`);
      console.log(`  Avg: ${hotspotsData.hotspots[0].avgTemperature}°C`);
    }
    if (hotspotsData.coldZones && hotspotsData.coldZones.length > 0) {
      console.log(`\nColdest zone: ${hotspotsData.coldZones[0].sensorName} (ID: ${hotspotsData.coldZones[0].sensorId})`);
      console.log(`  Avg: ${hotspotsData.coldZones[0].avgTemperature}°C`);
    }

    if (hotspotsData.chartData?.trendsChart) {
      const trends = hotspotsData.chartData.trendsChart;
      console.log(`  Trends chart has ${trends.datasets?.length || 0} datasets`);
      console.log(`  Trends chart has ${trends.labels?.length || 0} time points`);
      console.log(`  Comfort zone min: ${trends.options?.comfortZoneMin}`);
      console.log(`  Comfort zone max: ${trends.options?.comfortZoneMax}`);
      console.log(`  Overall average: ${trends.options?.overallAvg}\n`);
    }

    // Get temperature comfort metrics
    const metrics = await reportMetricsService.getTemperatureComfortMetrics(
      startDate,
      endDate,
      source
    );

    console.log('✓ Temperature metrics calculated');
    console.log(`  Comfort: ${metrics.comfort_percentage}%`);
    console.log(`  Critical: ${metrics.critical_percentage}%\n`);

    // Load template
    const templateName = 'hotspots_portrait.svg';
    let template = await svgTemplateService.loadTemplate(templateName);

    console.log('✓ Template loaded\n');

    // Prepare template data
    const templateData = {
      ...metrics,
      label_building_name: 'BUILDING NAME',
      label_report_period: 'REPORT PERIOD',
      label_total_sensors: 'TOTAL SENSORS',
      label_active: 'ACTIVE',
      label_report_overview: 'Report Overview',
      label_key_metrics: 'Key Metrics',
      label_comfort: 'Comfort',
      label_critical: 'Critical',
      label_ideal_zone: 'Ideal Zone',
      label_out_of_range: 'Out of Range',
      label_temp_distribution: 'Temperature Distribution',
      label_temperature_trends: 'Temperature Trends',
      label_total: 'Total',
      label_cold: 'Cold',
      label_heat: 'Heat',
      label_temp_ranges: 'Temperature Ranges',
      label_hotspots_coldzones: 'Hotspots and Cold Zones',
      label_temp_details: 'Temperature Details by Sensor',
      report_description: 'This report analyzes temperature patterns across all monitored sensors.',
      building_name: 'Test Building',
      report_period: `${startDate.split('T')[0]} - ${endDate.split('T')[0]}`,
      total_sensors: '30',
      active_sensors: '30',
      hotspot_1_sensor: hotspotsData.hotspots?.[0]?.sensorName || 'N/A',
      hotspot_1_avg: hotspotsData.hotspots?.[0]?.avgTemperature || '0',
      hotspot_1_min: hotspotsData.hotspots?.[0]?.minTemperature || '0',
      hotspot_1_max: hotspotsData.hotspots?.[0]?.maxTemperature || '0',
      coldzone_1_sensor: hotspotsData.coldZones?.[0]?.sensorName || 'N/A',
      coldzone_1_avg: hotspotsData.coldZones?.[0]?.avgTemperature || '0',
      coldzone_1_min: hotspotsData.coldZones?.[0]?.minTemperature || '0',
      coldzone_1_max: hotspotsData.coldZones?.[0]?.maxTemperature || '0'
    };

    // Replace placeholders
    template = svgTemplateService.replacePlaceholders(template, templateData);
    const localizedSvg = translateTemplateText(template, locale);

    // Generate HTML with charts
    const htmlOptions = {
      layout: 'portrait',
      pageSize: 'A4',
      chartType: 'temperature-trends',
      locale
    };

    const chartData = hotspotsData.chartData;
    const html = svgTemplateService.generateHtmlWithSvg(localizedSvg, chartData, htmlOptions);

    // Save HTML
    await writeFile('/tmp/test_trends_direct.html', html);
    console.log('✓ HTML generated and saved to /tmp/test_trends_direct.html\n');

    // Check for chart data in HTML
    const hasTrendsCanvas = html.includes('id="temperature-trends-chart"');
    const hasTrendsChartData = html.includes('trendsChart');
    const hasComfortZonePlugin = html.includes('comfortZonePlugin');
    const hasOverallAvgLine = html.includes('Overall Average');
    const hasComparisonCanvas = html.includes('id="temperature-comparison-chart"');
    const hasComparisonChartData = html.includes('comparisonChart');
    const hasTempComparisonCtx = html.includes('tempComparisonCtx');
    const hasTempTrendsCtx = html.includes('tempTrendsCtx');
    const hasAllChartData = html.includes('const allChartData');

    console.log('Temperature Trends Chart verification:');
    console.log(`  Has trends canvas element: ${hasTrendsCanvas ? '✓' : '✗'}`);
    console.log(`  Has trends chart data: ${hasTrendsChartData ? '✓' : '✗'}`);
    console.log(`  Has comfort zone plugin: ${hasComfortZonePlugin ? '✓' : '✗'}`);
    console.log(`  Has overall average line: ${hasOverallAvgLine ? '✓' : '✗'}`);
    console.log(`  Has trends context variable: ${hasTempTrendsCtx ? '✓' : '✗'}\n`);

    console.log('Temperature Comparison Chart verification:');
    console.log(`  Has comparison canvas element: ${hasComparisonCanvas ? '✓' : '✗'}`);
    console.log(`  Has comparison chart data: ${hasComparisonChartData ? '✓' : '✗'}`);
    console.log(`  Has comparison context variable: ${hasTempComparisonCtx ? '✓' : '✗'}\n`);

    console.log('Architecture verification:');
    console.log(`  Uses allChartData structure: ${hasAllChartData ? '✓' : '✗'}`);
    console.log(`  Both charts can render independently: ${hasTempComparisonCtx && hasTempTrendsCtx ? '✓' : '✗'}\n`);

    if (hasTrendsCanvas && hasTrendsChartData && hasComfortZonePlugin && hasOverallAvgLine && hasComparisonCanvas && hasAllChartData && hasTempComparisonCtx && hasTempTrendsCtx) {
      console.log('============================================================');
      console.log('✅ Temperature trends chart implementation successful!');
      console.log('============================================================');
      console.log('\nOpen /tmp/test_trends_direct.html in a browser to view the report.');
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

testTrendsDirect();
