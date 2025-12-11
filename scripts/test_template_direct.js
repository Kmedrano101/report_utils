/**
 * Direct template test - bypasses cache by creating new service instance
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import reportMetricsService from './src/services/reportMetricsService.js';
import { translateTemplateText } from './src/utils/templateLocalization.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testTemplate() {
  try {
    console.log('Testing new template directly...\n');

    const startDate = '2025-12-10T00:00:00Z';
    const endDate = '2025-12-11T00:00:00Z';
    const source = 'external';

    // Get metrics
    const metrics = await reportMetricsService.getTemperatureComfortMetrics(
      startDate,
      endDate,
      source
    );

    console.log('✓ Metrics calculated:');
    console.log(`  Comfort: ${metrics.comfort_percentage}%`);
    console.log(`  Critical: ${metrics.critical_percentage}%`);
    console.log(`  Cold Arc Length: ${metrics.cold_arc_length}`);
    console.log(`  Comfort Arc Length: ${metrics.comfort_arc_length}`);
    console.log(`  Hot Arc Length: ${metrics.hot_arc_length}\n`);

    // Load template directly
    const templatePath = join(__dirname, 'src/templates/svg/hotspots_portrait.svg');
    let template = await readFile(templatePath, 'utf-8');

    console.log('✓ Template loaded directly from file\n');

    // Check for new sections
    const hasReportDesc = template.includes('id="report-description"');
    const hasKeyMetrics = template.includes('id="key-metrics-column"');
    const hasDonutChart = template.includes('id="temperature-distribution-chart"');
    const hasLabels = template.includes('{{label_key_metrics}}');

    console.log('Template verification:');
    console.log(`  Has report-description: ${hasReportDesc ? '✓' : '✗'}`);
    console.log(`  Has key-metrics-column: ${hasKeyMetrics ? '✓' : '✗'}`);
    console.log(`  Has donut chart section: ${hasDonutChart ? '✓' : '✗'}`);
    console.log(`  Has label variables: ${hasLabels ? '✓' : '✗'}\n`);

    if (!hasReportDesc || !hasKeyMetrics || !hasDonutChart) {
      console.error('❌ Template does not have the new sections!');
      process.exit(1);
    }

    // Replace placeholders
    const replacements = {
      label_report_overview: 'Report Overview',
      label_key_metrics: 'Key Metrics',
      label_comfort: 'Comfort',
      label_critical: 'Critical',
      label_ideal_zone: 'Ideal Zone',
      label_out_of_range: 'Out of Range',
      label_temp_distribution: 'Temperature Distribution',
      label_total: 'Total',
      label_cold: 'Cold',
      label_heat: 'Heat',
      label_temp_ranges: 'Temperature Ranges',
      report_description: 'This report analyzes temperature patterns across all monitored sensors to identify hotspots (areas with consistently high temperatures) and cold zones (areas with consistently low temperatures). The comfort zone is defined as temperatures between 20°C and 26°C, providing optimal conditions for occupancy and equipment operation.',
      ...metrics
    };

    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      template = template.replace(regex, String(value));
    }

    console.log('✓ Placeholders replaced\n');

    // Test English version
    const englishTemplate = template;
    const hasComfortText = englishTemplate.includes('>Comfort<');
    const hasCriticalText = englishTemplate.includes('>Critical<');
    const has25Percent = englishTemplate.includes(`>${metrics.comfort_percentage}<`);

    console.log('English version:');
    console.log(`  Has "Comfort" text: ${hasComfortText ? '✓' : '✗'}`);
    console.log(`  Has "Critical" text: ${hasCriticalText ? '✓' : '✗'}`);
    console.log(`  Has comfort percentage (${metrics.comfort_percentage}%): ${has25Percent ? '✓' : '✗'}\n`);

    // Test Spanish version (labels only - description is set in controller)
    let spanishTemplate = template;

    // Replace description with Spanish version (simulating controller behavior)
    spanishTemplate = spanishTemplate.replace(
      replacements.report_description,
      'Este informe analiza los patrones de temperatura en todos los sensores monitoreados para identificar zonas calientes (áreas con temperaturas consistentemente altas) y zonas frías (áreas con temperaturas consistentemente bajas). La zona de confort se define como temperaturas entre 20°C y 26°C, proporcionando condiciones óptimas para la ocupación y operación de equipos.'
    );

    spanishTemplate = translateTemplateText(spanishTemplate, 'es');
    const hasConfortText = spanishTemplate.includes('>Confort<');
    const hasCriticoText = spanishTemplate.includes('>Crítico<');
    const hasResumenText = spanishTemplate.includes('Resumen del informe');
    const hasSpanishDesc = spanishTemplate.includes('Este informe analiza los patrones de temperatura');

    console.log('Spanish version:');
    console.log(`  Has "Confort" text: ${hasConfortText ? '✓' : '✗'}`);
    console.log(`  Has "Crítico" text: ${hasCriticoText ? '✓' : '✗'}`);
    console.log(`  Has "Resumen del informe": ${hasResumenText ? '✓' : '✗'}`);
    console.log(`  Has Spanish description: ${hasSpanishDesc ? '✓' : '✗'}\n`);

    if (hasComfortText && hasCriticalText && has25Percent && hasConfortText && hasCriticoText && hasResumenText && hasSpanishDesc) {
      console.log('============================================================');
      console.log('✅ All tests passed! New template works correctly!');
      console.log('============================================================');
    } else {
      console.log('❌ Some tests failed');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testTemplate();
