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
    this.layoutTemplates = {
      portrait: {
        template: 'template_vertical.svg',
        positions: {
          title: { x: 297.32, y: 60, fontSize: 32, anchor: 'middle', fill: '#ffffff', fontWeight: 600 },
          subtitle: { x: 297.32, y: 95, fontSize: 18, anchor: 'middle', fill: '#d1d5db', fontWeight: 400 },
          footerText: { x: 60, y: 760, fontSize: 16, anchor: 'start', fill: '#202020', fontWeight: 500 },
          footerDate: { x: 534, y: 760, fontSize: 16, anchor: 'end', fill: '#202020', fontWeight: 500 }
        }
      },
      landscape: {
        template: 'template_horizontal.svg',
        positions: {
          title: { x: 420.95, y: 85, fontSize: 34, anchor: 'middle', fill: '#ffffff', fontWeight: 600 },
          subtitle: { x: 420.95, y: 125, fontSize: 20, anchor: 'middle', fill: '#d1d5db', fontWeight: 400 },
          footerText: { x: 80, y: 560, fontSize: 16, anchor: 'start', fill: '#202020', fontWeight: 500 },
          footerDate: { x: 780, y: 560, fontSize: 16, anchor: 'end', fill: '#202020', fontWeight: 500 }
        }
      }
    };
    this.themePalettes = {
      'professional-blue': {
        header: '#0F172A',        // Dark slate blue
        footer: '#0F172A',
        accent: '#2563EB',
        headerText: '#C7AB81',    // Gold - works great with white logo
        headerSubtitle: '#E5D4BA', // Light gold
        footerText: '#FFFFFF',    // White for high contrast
        footerDate: '#C7AB81'     // Gold accent
      },
      'corporate-green': {
        header: '#064E3B',        // Dark emerald green
        footer: '#064E3B',
        accent: '#10B981',
        headerText: '#FFFFFF',    // White for crisp contrast
        headerSubtitle: '#6EE7B7', // Light green
        footerText: '#FFFFFF',
        footerDate: '#6EE7B7'
      },
      'modern-purple': {
        header: '#4C1D95',        // Deep purple
        footer: '#4C1D95',
        accent: '#8B5CF6',
        headerText: '#FFFFFF',    // White for clarity
        headerSubtitle: '#C4B5FD', // Light purple
        footerText: '#FFFFFF',
        footerDate: '#C4B5FD'
      },
      'tech-orange': {
        header: '#7C2D12',        // Deep orange-brown
        footer: '#7C2D12',
        accent: '#F97316',
        headerText: '#FFFFFF',    // White for maximum contrast
        headerSubtitle: '#FED7AA', // Peach
        footerText: '#FFFFFF',
        footerDate: '#FED7AA'
      },
      'monochrome': {
        header: '#18181B',        // Almost black
        footer: '#18181B',
        accent: '#71717A',
        headerText: '#FFFFFF',    // Pure white
        headerSubtitle: '#D4D4D8', // Light gray
        footerText: '#FFFFFF',
        footerDate: '#D4D4D8'
      },
      'dark': {
        header: '#0F172A',        // Same as professional-blue for consistency
        footer: '#0F172A',
        accent: '#38BDF8',
        headerText: '#E0F2FE',    // Light blue
        headerSubtitle: '#BAE6FD', // Sky blue
        footerText: '#FFFFFF',
        footerDate: '#BAE6FD'
      }
    };
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
   * Get palette colors for a theme
   * @param {string} theme
   * @returns {Object} palette colors
   */
  getThemePalette(theme = 'professional-blue') {
    return this.themePalettes[theme] || this.themePalettes['professional-blue'];
  }

  /**
   * Generate final layout SVG with header/footer text from config
   * @param {Object} options
   * @returns {Promise<string>}
   */
  async generateFinalTemplateLayout(options = {}) {
    const {
      title = 'IoT Report',
      subtitle = 'Environmental & Energy Insights',
      footerText = 'Madison - IoT Report Suite',
      logoUrl = '',
      theme = 'professional-blue',
      layout = 'portrait'
    } = options;

    const palette = this.getThemePalette(theme);
    const templateName = layout === 'landscape' ? 'template_horizontal.svg' : 'template_vertical.svg';
    const template = await this.loadTemplate(templateName);

    const placeholders = {
      header_title: title,
      header_subtitle: subtitle,
      footer_text: footerText,
      generation_date: format(new Date(), 'MMM dd, yyyy HH:mm'),
      header_bg: palette.header,
      footer_bg: palette.footer,
      accent_color: palette.accent,
      header_text_color: palette.headerText,
      header_subtitle_color: palette.headerSubtitle,
      footer_text_color: palette.footerText,
      footer_date_color: palette.footerDate,
      logo_url: logoUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
    };

    return this.replacePlaceholders(template, placeholders);
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
   * Generate report using report_test.svg template
   * @param {Object} reportData - Report data
   * @returns {Promise<string>} Processed SVG
   */
  async generateTestReport(reportData) {
    try {
      let template = await this.loadTemplate('report_test.svg');

      const {
        title = 'IoT Sensor Summary Report',
        subtitle = 'Real-time monitoring and analytics',
        startDate,
        endDate,
        sensors = [],
        kpis = [],
        footerText = 'Madison - IoT Report'
      } = reportData;

      // Replace placeholders in the template
      const data = {
        reportTitle: title,
        reportSubtitle: subtitle,
        footerText: footerText,
        generationDate: format(new Date(), 'MMM dd, yyyy HH:mm')
      };

      // Replace all placeholders
      template = this.replacePlaceholders(template, data);

      // Add subtitle text overlay if not already in template
      // Insert before closing </svg> tag
      const subtitleOverlay = `
        <text x="105" y="40"
              text-anchor="middle"
              font-family="Arial, sans-serif"
              font-size="6"
              fill="#666666">
          ${this.escapeXml(subtitle)}
        </text>
        <text x="10" y="290"
              font-family="Arial, sans-serif"
              font-size="4"
              fill="#333333">
          ${this.escapeXml(footerText)}
        </text>
        <text x="200" y="290"
              text-anchor="end"
              font-family="Arial, sans-serif"
              font-size="4"
              fill="#333333">
          ${data.generationDate}
        </text>
      `;

      template = template.replace('</svg>', `${subtitleOverlay}</svg>`);

      logger.info('Generated test report SVG using report_test.svg template', {
        sensors: sensors.length,
        kpis: kpis.length,
        title,
        subtitle
      });

      return template;
    } catch (error) {
      logger.error('Error generating test report', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate simple layout preview using Madison base templates
   * @param {Object} options - Preview options
   * @returns {Promise<string>} Processed SVG
   */
  async generateLayoutPreview(options = {}) {
    const {
      layout = 'portrait',
      templateName = null,
      title = 'IoT Sensor Summary Report',
      subtitle = 'Real-time monitoring and analytics',
      footerText = 'Madison - IoT Report'
    } = options;

    const normalizedLayout = layout === 'landscape' ? 'landscape' : 'portrait';
    let layoutConfig = this.layoutTemplates[normalizedLayout];

    if (templateName) {
      const matchedConfig = Object.values(this.layoutTemplates).find(cfg => cfg.template === templateName);
      if (!matchedConfig) {
        throw new Error(`Unsupported template for layout preview: ${templateName}`);
      }
      layoutConfig = matchedConfig;
    }

    let template = await this.loadTemplate(layoutConfig.template);
    const timestamp = format(new Date(), 'MMM dd, yyyy HH:mm');
    const overlayParts = [];

    const { positions } = layoutConfig;
    const fontFamily = 'Inter, Arial, sans-serif';

    if (title) {
      const pos = positions.title;
      overlayParts.push(`
        <text x="${pos.x}" y="${pos.y}"
              text-anchor="${pos.anchor}"
              font-family="${fontFamily}"
              font-size="${pos.fontSize}"
              font-weight="${pos.fontWeight}"
              fill="${pos.fill}">
          ${this.escapeXml(title)}
        </text>
      `);
    }

    if (subtitle) {
      const pos = positions.subtitle;
      overlayParts.push(`
        <text x="${pos.x}" y="${pos.y}"
              text-anchor="${pos.anchor}"
              font-family="${fontFamily}"
              font-size="${pos.fontSize}"
              font-weight="${pos.fontWeight}"
              fill="${pos.fill}">
          ${this.escapeXml(subtitle)}
        </text>
      `);
    }

    if (footerText) {
      const pos = positions.footerText;
      overlayParts.push(`
        <text x="${pos.x}" y="${pos.y}"
              text-anchor="${pos.anchor}"
              font-family="${fontFamily}"
              font-size="${pos.fontSize}"
              font-weight="${pos.fontWeight}"
              fill="${pos.fill}">
          ${this.escapeXml(footerText)}
        </text>
      `);
    }

    const footerDatePos = positions.footerDate;
    overlayParts.push(`
      <text x="${footerDatePos.x}" y="${footerDatePos.y}"
            text-anchor="${footerDatePos.anchor}"
            font-family="${fontFamily}"
            font-size="${footerDatePos.fontSize}"
            font-weight="${footerDatePos.fontWeight}"
            fill="${footerDatePos.fill}">
        ${this.escapeXml(timestamp)}
      </text>
    `);

    const overlayGroup = `
      <g id="layout-preview-overlay">
        ${overlayParts.join('\n')}
      </g>
    `;

    template = template.replace('</svg>', `${overlayGroup}</svg>`);
    return template;
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
  generateHtmlWithSvg(svgContent, chartData = null, options = {}) {
    const pageSize = (options.pageSize || 'A4').toUpperCase();
    const isLandscape = options.layout === 'landscape';
    const dimensions = {
      A4: { portrait: { width: '210mm', height: '297mm' }, landscape: { width: '297mm', height: '210mm' } },
      LETTER: { portrait: { width: '216mm', height: '279mm' }, landscape: { width: '279mm', height: '216mm' } },
      LEGAL: { portrait: { width: '216mm', height: '356mm' }, landscape: { width: '356mm', height: '216mm' } }
    };
    const size = dimensions[pageSize] || dimensions.A4;
    const { width, height } = isLandscape ? size.landscape : size.portrait;

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
    html, body {
      width: ${width};
      height: ${height};
      margin: 0;
      padding: 0;
      overflow: hidden;
      font-family: 'Inter', sans-serif;
      background: white;
    }
    .svg-container {
      width: ${width};
      height: ${height};
      margin: 0;
      padding: 0;
      background: white;
      display: block;
      overflow: hidden;
    }
    .svg-container svg {
      display: block;
      width: ${width};
      height: ${height};
    }
    #chart-container { width: 100%; height: 100%; }
    @page {
      size: ${pageSize} ${isLandscape ? 'landscape' : 'portrait'};
      margin: 0;
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
      const chartType = '${options.chartType || 'time-series'}';

      if (chartType === 'temperature-comparison') {
        // Temperature comparison chart (horizontal bar)
        const ctx = document.getElementById('temperature-comparison-chart');
        if (ctx) {
          const chartData = ${JSON.stringify(chartData)};
          new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                title: { display: false }
              },
              scales: {
                x: {
                  beginAtZero: false,
                  title: {
                    display: true,
                    text: 'Temperature (°C)',
                    font: { size: 10 }
                  },
                  ticks: { font: { size: 9 } }
                },
                y: {
                  ticks: { font: { size: 9 } }
                }
              }
            }
          });
        }
      } else if (chartType === 'consumption-comparison') {
        // Power consumption comparison chart (bar chart)
        const ctx = document.getElementById('consumption-comparison-chart');
        if (ctx) {
          const chartData = ${JSON.stringify(chartData)};
          new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                title: { display: false }
              },
              scales: {
                x: {
                  title: {
                    display: true,
                    text: 'Channels',
                    font: { size: 10 }
                  },
                  ticks: { font: { size: 9 } }
                },
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Consumption (A)',
                    font: { size: 10 }
                  },
                  ticks: { font: { size: 9 } }
                }
              }
            }
          });
        }
      } else {
        // Default time-series chart
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
