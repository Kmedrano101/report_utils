/**
 * SVG Template Service
 * Handles SVG template loading and dynamic data injection
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { format } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SvgTemplateService {
  constructor() {
    this.templateCache = new Map();
    this.templateBasePath = join(__dirname, '../templates/svg');
  }

  /**
   * Load SVG template from file
   * @param {string} templateName - Template filename
   * @param {boolean} useCache - Whether to use cached template
   * @returns {Promise<string>} SVG content
   */
  async loadTemplate(templateName, useCache = true) {
    try {
      // Check cache first
      if (useCache && this.templateCache.has(templateName)) {
        logger.debug(`Using cached template: ${templateName}`);
        return this.templateCache.get(templateName);
      }

      const templatePath = join(this.templateBasePath, templateName);
      const content = await readFile(templatePath, 'utf-8');

      // Cache the template
      if (useCache) {
        this.templateCache.set(templateName, content);
      }

      logger.debug(`Loaded template: ${templateName}`);
      return content;
    } catch (error) {
      logger.error('Error loading SVG template', { error: error.message, templateName });
      throw new Error(`Failed to load template: ${templateName}`);
    }
  }

  /**
   * Replace placeholders in template with actual data
   * @param {string} template - SVG template content
   * @param {Object} data - Data to inject
   * @returns {string} Processed SVG
   */
  replacePlaceholders(template, data) {
    let result = template;

    // Replace all {{placeholder}} with data values
    Object.keys(data).forEach(key => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      const value = data[key] !== undefined && data[key] !== null ? data[key] : '';
      result = result.replace(placeholder, this.escapeXml(String(value)));
    });

    // Remove any remaining unreplaced placeholders
    result = result.replace(/{{[^}]+}}/g, '');

    return result;
  }

  /**
   * Generate sensor rows for the report
   * @param {Array} sensors - Array of sensor objects
   * @param {number} startY - Starting Y position
   * @returns {string} SVG group with sensor rows
   */
  generateSensorRows(sensors, startY = 500) {
    let svgRows = '';
    let yPosition = startY;
    const rowHeight = 35;

    sensors.forEach((sensor, index) => {
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';

      svgRows += `
        <g id="sensor-row-${index}">
          <rect x="40" y="${yPosition}" width="714" height="${rowHeight}" fill="${bgColor}"/>
          <text x="60" y="${yPosition + 22}" class="text">${this.escapeXml(sensor.name)}</text>
          <text x="280" y="${yPosition + 22}" class="small">${this.escapeXml(sensor.sensor_type)}</text>
          <text x="420" y="${yPosition + 22}" class="small">${this.escapeXml(sensor.location || 'N/A')}</text>
          <text x="620" y="${yPosition + 22}" class="text">${this.formatValue(sensor.latest_value)} ${this.escapeXml(sensor.unit || '')}</text>
        </g>
      `;

      yPosition += rowHeight;
    });

    return svgRows;
  }

  /**
   * Process IoT summary report template
   * @param {Object} reportData - Report data
   * @returns {Promise<string>} Processed SVG
   */
  async generateIoTSummaryReport(reportData) {
    try {
      const template = await this.loadTemplate('iot-summary-report.svg');

      const {
        title = 'IoT Sensor Summary Report',
        subtitle = 'Real-time monitoring and analytics',
        startDate,
        endDate,
        sensors = [],
        kpis = []
      } = reportData;

      // Calculate positions for dynamic content
      const sensorRowsStartY = 500;
      const sensorRowsHeight = sensors.length * 35;
      const chartYPosition = sensorRowsStartY + sensorRowsHeight + 60;

      // Prepare data for replacement
      const data = {
        report_title: title,
        report_subtitle: subtitle,
        generation_date: format(new Date(), 'MMM dd, yyyy HH:mm'),
        generation_timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        date_range: `${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}`,
        total_sensors: sensors.length,
        active_sensors: sensors.filter(s => s.is_active).length,

        // KPIs (up to 4)
        kpi_1_name: kpis[0]?.kpi_name?.toUpperCase() || 'N/A',
        kpi_1_value: this.formatValue(kpis[0]?.value),
        kpi_1_unit: kpis[0]?.unit || '',

        kpi_2_name: kpis[1]?.kpi_name?.toUpperCase() || 'N/A',
        kpi_2_value: this.formatValue(kpis[1]?.value),
        kpi_2_unit: kpis[1]?.unit || '',

        kpi_3_name: kpis[2]?.kpi_name?.toUpperCase() || 'N/A',
        kpi_3_value: this.formatValue(kpis[2]?.value),
        kpi_3_unit: kpis[2]?.unit || '',

        kpi_4_name: kpis[3]?.kpi_name?.toUpperCase() || 'N/A',
        kpi_4_value: this.formatValue(kpis[3]?.value),
        kpi_4_unit: kpis[3]?.unit || '',

        // Dynamic sensor rows
        sensor_rows: this.generateSensorRows(sensors.slice(0, 15), sensorRowsStartY), // Limit to 15 for space

        // Chart positions
        chart_y_position: chartYPosition,
        chart_y_position_plus_15: chartYPosition + 15,
        chart_y_position_plus_25: chartYPosition + 25,
        chart_center_y: chartYPosition + 165
      };

      const processedSvg = this.replacePlaceholders(template, data);

      logger.info('Generated IoT summary report SVG', {
        sensors: sensors.length,
        kpis: kpis.length
      });

      return processedSvg;
    } catch (error) {
      logger.error('Error generating IoT summary report', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate HTML wrapper for SVG with Chart.js support
   * @param {string} svgContent - SVG content
   * @param {Object} chartData - Chart data for Chart.js
   * @returns {string} Complete HTML document
   */
  generateHtmlWithSvg(svgContent, chartData = null) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IoT Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #fafafa; }
    .svg-container { width: 210mm; margin: 0 auto; background: white; }
    #chart-container { width: 100%; height: 100%; }
    @media print {
      body { background: white; }
      @page { size: A4; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="svg-container">
    ${svgContent}
  </div>

  <script>
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
      ${chartData ? `
      // Generate Chart.js chart
      const ctx = document.getElementById('time-series-chart');
      if (ctx) {
        const chartData = ${JSON.stringify(chartData)};
        new Chart(ctx, {
          type: 'line',
          data: chartData,
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: { position: 'top' },
              title: { display: false }
            },
            scales: {
              y: { beginAtZero: false }
            }
          }
        });
      }
      ` : ''}

      // Signal that rendering is complete for Puppeteer
      setTimeout(() => {
        const marker = document.createElement('div');
        marker.id = 'render-complete';
        marker.style.display = 'none';
        document.body.appendChild(marker);
      }, 1000);
    });
  </script>
</body>
</html>
    `;
  }

  /**
   * Format numeric value for display
   * @param {number} value - Value to format
   * @returns {string} Formatted value
   */
  formatValue(value) {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return String(value);
  }

  /**
   * Escape XML special characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeXml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Clear template cache
   */
  clearCache() {
    this.templateCache.clear();
    logger.info('Template cache cleared');
  }
}

export default new SvgTemplateService();
