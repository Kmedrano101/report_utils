/**
 * Report Controller
 * Handles report generation requests
 */

import iotDataService from '../services/iotDataService.js';
import svgTemplateService from '../services/svgTemplateService.js';
import pdfGenerationService from '../services/pdfGenerationService.js';
import reportMetricsService from '../services/reportMetricsService.js';
import database from '../config/database.js';
import logger from '../utils/logger.js';
import { parseISO, subDays } from 'date-fns';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isMissingRelationError = error =>
  error?.code === '42P01' || /relation .* does not exist/i.test(error?.message || '');

class ReportController {
  /**
   * Generate PDF from HTML
   * POST /api/reports/generate-pdf
   */
  async generatePDFFromHTML(req, res) {
    const startTime = Date.now();

    try {
      const { html, options = {} } = req.body;

      if (!html) {
        return res.status(400).json({
          success: false,
          error: 'HTML content is required'
        });
      }

      logger.info('Generating PDF from HTML', { optionsProvided: !!options });

      // Generate PDF
      const pdfBuffer = await pdfGenerationService.generatePdfFromHtml(html, options);

      // Log generation to database
      await this.logReportGeneration({
        template_id: null,
        report_name: 'Custom PDF Report',
        parameters: { customTemplate: true },
        file_size_kb: Math.round(pdfBuffer.length / 1024),
        generation_time_ms: Date.now() - startTime,
        status: 'generated'
      });

      // Send PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="report-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.end(pdfBuffer, 'binary');

    } catch (error) {
      logger.error('Error generating PDF from HTML', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Generate Test Template report (using report_test.svg)
   * POST /api/reports/test-template
   */
  async generateTestTemplateReport(req, res) {
    const startTime = Date.now();

    try {
      const {
        reportTitle = 'IoT Sensor Summary Report',
        reportSubtitle = 'Real-time monitoring and analytics',
        footerText = 'Madison - IoT Report',
        layout = 'portrait',
        pageSize = 'a4',
        templateName = null,
        format = 'pdf'
      } = req.body;

      const normalizedLayout = layout === 'landscape' ? 'landscape' : 'portrait';
      logger.info('Generating template preview report', {
        format,
        layout: normalizedLayout,
        template: templateName || 'auto'
      });
      let resolvedTemplate = templateName;
      let svgContent;

      if (!resolvedTemplate || resolvedTemplate === 'report_test.svg') {
        resolvedTemplate = 'report_test.svg';
        svgContent = await svgTemplateService.generateTestReport({
          title: reportTitle,
          subtitle: reportSubtitle,
          footerText
        });
      } else {
        svgContent = await svgTemplateService.generateLayoutPreview({
          layout: normalizedLayout,
          templateName: resolvedTemplate,
          title: reportTitle,
          subtitle: reportSubtitle,
          footerText
        });
      }

      // Wrap in HTML
      const htmlContent = svgTemplateService.generateHtmlWithSvg(svgContent);

      // Return format
      if (format === 'html') {
        res.setHeader('Content-Type', 'text/html');
        return res.send(htmlContent);
      }

      const pdfFormat = this.getPdfFormat(pageSize);

      // Generate PDF
      const pdfBuffer = await pdfGenerationService.generatePdfFromHtml(htmlContent, {
        format: pdfFormat,
        landscape: normalizedLayout === 'landscape'
      });

      // Log generation to database
      await this.logReportGeneration({
        template_id: null,
        report_name: 'Template Preview Report',
        parameters: {
          layout: normalizedLayout,
          pageSize: pdfFormat,
          template: resolvedTemplate
        },
        file_size_kb: Math.round(pdfBuffer.length / 1024),
        generation_time_ms: Date.now() - startTime,
        status: 'generated'
      });

      // Send PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="test-report-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.end(pdfBuffer, 'binary');

    } catch (error) {
      logger.error('Error generating test template report', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Generate IoT summary report
   * POST /api/reports/iot-summary
   */
  async generateIoTSummaryReport(req, res) {
    const startTime = Date.now();

    try {
      const {
        startDate = subDays(new Date(), 7).toISOString(),
        endDate = new Date().toISOString(),
        sensorIds = null,
        filters = {},
        format = 'pdf' // pdf or html
      } = req.body;

      logger.info('Generating IoT summary report', { startDate, endDate, format });

      // Fetch sensors
      const sensors = sensorIds
        ? await Promise.all(sensorIds.map(id => iotDataService.getSensorById(id)))
        : await iotDataService.getSensors(filters);

      if (sensors.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No sensors found matching criteria'
        });
      }

      // Fetch KPIs
      const kpis = await iotDataService.getAllKPIs(startDate, endDate);

      // Generate SVG with data
      const svgContent = await svgTemplateService.generateIoTSummaryReport({
        title: 'IoT Sensor Summary Report',
        subtitle: 'Real-time monitoring and analytics',
        startDate,
        endDate,
        sensors,
        kpis
      });

      // Wrap in HTML
      const htmlContent = svgTemplateService.generateHtmlWithSvg(svgContent);

      // Return format
      if (format === 'html') {
        res.setHeader('Content-Type', 'text/html');
        return res.send(htmlContent);
      }

      // Generate PDF
      const pdfBuffer = await pdfGenerationService.generatePdfFromHtml(htmlContent);

      // Log generation to database
      await this.logReportGeneration({
        template_id: null,
        report_name: 'IoT Summary Report',
        parameters: { startDate, endDate, sensorCount: sensors.length },
        file_size_kb: Math.round(pdfBuffer.length / 1024),
        generation_time_ms: Date.now() - startTime,
        status: 'generated'
      });

      // Send PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="iot-summary-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.end(pdfBuffer, 'binary');

    } catch (error) {
      logger.error('Error generating IoT summary report', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Generate sensor detailed report
   * POST /api/reports/sensor-detailed
   */
  async generateSensorDetailedReport(req, res) {
    const startTime = Date.now();

    try {
      const {
        sensorId,
        startDate = subDays(new Date(), 30).toISOString(),
        endDate = new Date().toISOString(),
        aggregation = 'hourly',
        format = 'pdf'
      } = req.body;

      if (!sensorId) {
        return res.status(400).json({
          success: false,
          error: 'sensorId is required'
        });
      }

      logger.info('Generating sensor detailed report', { sensorId, startDate, endDate });

      // Fetch sensor info
      const sensor = await iotDataService.getSensorById(sensorId);

      // Fetch readings
      const readings = await iotDataService.getSensorReadings(sensorId, startDate, endDate, aggregation);

      // Fetch statistics
      const statistics = await iotDataService.getSensorStatistics(sensorId, startDate, endDate);

      // Generate report data
      const reportData = {
        sensor,
        readings,
        statistics,
        startDate,
        endDate,
        aggregation
      };

      res.json({
        success: true,
        data: reportData,
        message: 'Sensor detailed report data retrieved (PDF generation not yet implemented for this template)'
      });

    } catch (error) {
      logger.error('Error generating sensor detailed report', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Generate building report
   * POST /api/reports/building
   */
  async generateBuildingReport(req, res) {
    try {
      const {
        building,
        startDate = subDays(new Date(), 7).toISOString(),
        endDate = new Date().toISOString()
      } = req.body;

      if (!building) {
        return res.status(400).json({
          success: false,
          error: 'building name is required'
        });
      }

      logger.info('Generating building report', { building, startDate, endDate });

      const buildingSummary = await iotDataService.getBuildingSummary(building, startDate, endDate);

      res.json({
        success: true,
        data: buildingSummary
      });

    } catch (error) {
      logger.error('Error generating building report', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get available report templates
   * GET /api/reports/templates
   */
  async getTemplates(req, res) {
    try {
      // Read SVG files from templates directory
      const templatesPath = join(__dirname, '../templates/svg');
      const files = await readdir(templatesPath);

      // Filter only .svg files
      const svgTemplates = files
        .filter(file => file.endsWith('.svg'))
        .map(file => ({
          filename: file,
          name: file.replace('.svg', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: this.getTemplateDescription(file)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      res.json({
        success: true,
        data: svgTemplates
      });

    } catch (error) {
      logger.error('Error fetching templates', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Preview final SVG template with current configuration
   * POST /api/reports/layout-preview
   */
  async previewLayoutTemplate(req, res) {
    try {
      const {
        headerTitle = 'IoT Report',
        headerSubtitle = 'Environmental & Energy Insights',
        footerText = 'Madison - IoT Report Suite',
        logoUrl = '',
        theme = 'professional-blue',
        layout = 'portrait',
        pageSize = 'a4'
      } = req.body;

      const svg = await svgTemplateService.generateFinalTemplateLayout({
        title: headerTitle,
        subtitle: headerSubtitle,
        footerText,
        logoUrl,
        theme,
        layout
      });

      const html = svgTemplateService.generateHtmlWithSvg(svg, null, {
        layout,
        pageSize: pageSize.toUpperCase()
      });

      res.json({
        success: true,
        html
      });
    } catch (error) {
      logger.error('Error generating layout preview', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Generate PDF/HTML using final template layout
   * POST /api/reports/final-template
   */
  async generateFinalTemplateReport(req, res) {
    const startTime = Date.now();

    try {
      const {
        headerTitle = 'IoT Report',
        headerSubtitle = 'Environmental & Energy Insights',
        footerText = 'Madison - IoT Report Suite',
        logoUrl = '',
        theme = 'professional-blue',
        format = 'pdf',
        layout = 'portrait',
        pageSize = 'a4'
      } = req.body;

      const svg = await svgTemplateService.generateFinalTemplateLayout({
        title: headerTitle,
        subtitle: headerSubtitle,
        footerText,
        logoUrl,
        theme,
        layout
      });

      const normalizedPage = pageSize?.toUpperCase() || 'A4';
      const html = svgTemplateService.generateHtmlWithSvg(svg, null, {
        layout,
        pageSize: normalizedPage
      });

      if (format === 'html') {
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      }

      const pdfBuffer = await pdfGenerationService.generatePdfFromHtml(html, {
        format: normalizedPage,
        landscape: layout === 'landscape',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      });

      await this.logReportGeneration({
        template_id: null,
        report_name: 'Final Layout Preview',
        parameters: { headerTitle, headerSubtitle, theme, layout },
        file_size_kb: Math.round(pdfBuffer.length / 1024),
        generation_time_ms: Date.now() - startTime,
        status: 'generated'
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="template-preview.pdf"');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.end(pdfBuffer, 'binary');
    } catch (error) {
      logger.error('Error generating final template report', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get report generation history
   * GET /api/reports/history
   */
  async getReportHistory(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;

      const result = await database.query(`
        SELECT
          gr.*,
          t.name as template_name
        FROM reports.generated_reports gr
        LEFT JOIN reports.templates t ON gr.template_id = t.id
        ORDER BY gr.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: result.rowCount
        }
      });

    } catch (error) {
      if (isMissingRelationError(error)) {
        logger.warn('Report history tables unavailable, returning empty list');
        return res.json({
          success: true,
          data: [],
          pagination: {
            limit: parseInt(req.query.limit || 50),
            offset: parseInt(req.query.offset || 0),
            total: 0
          }
        });
      }
      logger.error('Error fetching report history', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Normalize requested page size to Puppeteer format
   * @private
   */
  getPdfFormat(pageSize = 'a4') {
    const sizeMap = {
      a4: 'A4',
      letter: 'Letter',
      legal: 'Legal'
    };

    if (typeof pageSize === 'string') {
      const normalized = pageSize.toLowerCase();
      return sizeMap[normalized] || 'A4';
    }

    return 'A4';
  }

  /**
   * Log report generation to database
   * @private
   */
  async logReportGeneration(reportData) {
    try {
      await database.query(`
        INSERT INTO reports.generated_reports
          (template_id, report_name, parameters, file_size_kb, generation_time_ms, status)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        reportData.template_id,
        reportData.report_name,
        JSON.stringify(reportData.parameters),
        reportData.file_size_kb,
        reportData.generation_time_ms,
        reportData.status
      ]);
    } catch (error) {
      logger.error('Error logging report generation', { error: error.message });
      // Don't throw - logging failure shouldn't break report generation
    }
  }

  /**
   * Get report metrics for given date range
   * GET /api/reports/metrics?startDate=2025-01-01&endDate=2025-01-31&source=external
   */
  async getReportMetrics(req, res) {
    try {
      const { startDate, endDate, source = 'external' } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'startDate and endDate are required parameters'
        });
      }

      logger.info('Fetching report metrics', { startDate, endDate, source });

      const metrics = await reportMetricsService.getReportMetrics({
        startDate,
        endDate,
        source
      });

      return res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      logger.error('Failed to get report metrics', { error: error.message });
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Test report with metrics from last 7 days
   * POST /api/reports/test-metrics
   */
  async generateMetricsTestReport(req, res) {
    const startTime = Date.now();

    try {
      const {
        layout = 'horizontal',
        pageSize = 'a4',
        format = 'pdf',
        source = 'external'
      } = req.body;

      logger.info('Generating metrics test report', { layout, pageSize, format, source });

      // Calculate date range (last 7 days)
      const endDate = new Date().toISOString();
      const startDate = subDays(new Date(), 7).toISOString();

      // Fetch metrics from VictoriaMetrics
      const metrics = await reportMetricsService.getReportMetrics({
        startDate,
        endDate,
        source
      });

      logger.info('Metrics fetched successfully', { metrics });

      // Determine which template to use
      // Use the same templates as preview: template_horizontal.svg and template_vertical.svg
      const normalizedLayout = layout.toLowerCase();
      const templateName = normalizedLayout === 'horizontal'
        ? 'template_horizontal.svg'
        : 'template_vertical.svg';

      // Prepare template data with metrics and defaults
      // Default configuration: Professional Blue theme, Madison logo, horizontal orientation
      const templateData = {
        // Header (Professional Blue theme)
        header_title: 'IoT Sensor Summary Report',
        header_subtitle: 'Real-time monitoring and analytics',
        header_bg: '#1e40af',        // Professional Blue
        header_text_color: '#ffffff',
        header_subtitle_color: '#e0e7ff',
        logo_url: '/images/logo_madison.png',  // Madison logo

        // Metrics from VictoriaMetrics
        ...metrics,

        // Building name
        building_name: 'Madison Arena',

        // Footer
        footer_text: 'Madison - IoT Report',
        footer_bg: '#f3f4f6',
        footer_text_color: '#374151',
        footer_date_color: '#6b7280',

        // Additional placeholders for sensor table
        sensor_1_name: 'Temperature Sensor T1',
        sensor_1_type: 'temperature',
        sensor_1_location: 'Zone A',
        sensor_1_value: `${metrics.avg_temperature}°C`,
        sensor_1_status_color: '#10b981',

        sensor_2_name: 'Humidity Sensor T1',
        sensor_2_type: 'humidity',
        sensor_2_location: 'Zone A',
        sensor_2_value: `${metrics.avg_humidity}%`,
        sensor_2_status_color: '#10b981',

        // Status info
        last_update_time: new Date().toLocaleString('es-ES')
      };

      // Load template and replace placeholders
      const templateContent = await svgTemplateService.loadTemplate(templateName);
      const svgContent = svgTemplateService.replacePlaceholders(templateContent, templateData);

      // Wrap in HTML
      const htmlContent = svgTemplateService.generateHtmlWithSvg(svgContent);

      // Return format
      if (format === 'html') {
        res.setHeader('Content-Type', 'text/html');
        return res.send(htmlContent);
      }

      const pdfFormat = this.getPdfFormat(pageSize);

      // Generate PDF
      const pdfBuffer = await pdfGenerationService.generatePdfFromHtml(htmlContent, {
        format: pdfFormat,
        landscape: normalizedLayout === 'horizontal'
      });

      // Log generation to database
      await this.logReportGeneration({
        template_id: null,
        report_name: 'Metrics Test Report',
        parameters: {
          layout: normalizedLayout,
          pageSize: pdfFormat,
          template: templateName,
          dateRange: metrics.date_range,
          source
        },
        file_size_kb: Math.round(pdfBuffer.length / 1024),
        generation_time_ms: Date.now() - startTime,
        status: 'generated'
      });

      // Send PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="metrics-test-report-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.end(pdfBuffer, 'binary');

      logger.info('Metrics test report generated successfully', {
        sizeKb: Math.round(pdfBuffer.length / 1024),
        durationMs: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Error generating metrics test report', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Generate key base metrics report with user-selected date range
   * POST /api/reports/key-metrics
   */
  async generateKeyMetricsReport(req, res) {
    const startTime = Date.now();

    try {
      const {
        startDate,
        endDate,
        layout = 'landscape',
        pageSize = 'a4',
        format = 'pdf',
        source = 'external',
        // Template configuration from web page
        headerTitle = 'IoT Sensor Summary Report',
        headerSubtitle = 'Real-time monitoring and analytics',
        footerText = 'Madison - IoT Report',
        logoUrl = '/images/logo_madison.png',
        theme = 'professional-blue'
      } = req.body;

      // Validate date range
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
      }

      logger.info('Generating key metrics report', { startDate, endDate, layout, pageSize, format, source, theme });

      // Fetch metrics from VictoriaMetrics for the specified date range
      const metrics = await reportMetricsService.getReportMetrics({
        startDate,
        endDate,
        source
      });

      logger.info('Metrics fetched successfully', { metrics });

      // Determine which template to use based on layout
      // Use metrics templates that have metric placeholders
      const normalizedLayout = layout.toLowerCase();
      const templateName = normalizedLayout === 'landscape' || normalizedLayout === 'horizontal'
        ? 'template_horizontal_metrics.svg'
        : 'template_vertical_metrics.svg';

      // Apply theme colors
      const themeColors = this.getThemeColors(theme);

      // Resolve logo path to base64 data URI for Puppeteer
      const resolvedLogoUrl = await this.resolveLogoPath(logoUrl);

      // Prepare template data with metrics and user configuration
      const templateData = {
        // Header (from template configuration)
        header_title: headerTitle,
        header_subtitle: headerSubtitle,
        header_bg: themeColors.header_bg,
        header_text_color: themeColors.header_text_color,
        header_subtitle_color: themeColors.header_subtitle_color,
        logo_url: resolvedLogoUrl,

        // Metrics from VictoriaMetrics
        ...metrics,

        // Building name
        building_name: 'Madison Arena',

        // Footer (from template configuration)
        footer_text: footerText,
        footer_bg: themeColors.footer_bg,
        footer_text_color: themeColors.footer_text_color,
        footer_date_color: themeColors.footer_date_color,

        // Additional placeholders
        sensor_1_name: 'Temperature Sensors',
        sensor_1_value: metrics.avg_temperature,
        sensor_2_name: 'Humidity Sensors',
        sensor_2_value: metrics.avg_humidity,
        sensor_3_name: 'Sound Sensors',
        sensor_3_value: metrics.avg_sound,
        sensor_4_name: 'Power Sensors',
        sensor_4_value: metrics.total_power
      };

      logger.info('Generating report with template', { templateName, layout: normalizedLayout });

      // Load and process template
      const templateContent = await svgTemplateService.loadTemplate(templateName);
      const svgContent = svgTemplateService.replacePlaceholders(templateContent, templateData);

      // Prepare HTML generation options
      const htmlOptions = {
        layout: normalizedLayout === 'landscape' || normalizedLayout === 'horizontal' ? 'landscape' : 'portrait',
        pageSize: pageSize.toUpperCase()
      };

      if (format === 'html') {
        const htmlContent = svgTemplateService.generateHtmlWithSvg(svgContent, null, htmlOptions);
        return res.send(htmlContent);
      }

      // Generate PDF
      const pdfOptions = {
        landscape: normalizedLayout === 'landscape' || normalizedLayout === 'horizontal',
        pageSize: pageSize.toUpperCase()
      };

      const pdfBuffer = await pdfGenerationService.generatePdfFromHtml(
        svgTemplateService.generateHtmlWithSvg(svgContent, null, htmlOptions),
        pdfOptions
      );

      const duration = Date.now() - startTime;
      logger.info('Key metrics report generated successfully', {
        format,
        layout: normalizedLayout,
        pageSize,
        duration: `${duration}ms`,
        size: `${(pdfBuffer.length / 1024).toFixed(2)} KB`
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="key-metrics-report-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.end(pdfBuffer, 'binary');

    } catch (error) {
      logger.error('Failed to generate key metrics report', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Resolve logo path to base64 data URI for Puppeteer
   * @param {string} logoPath - Logo path (can be relative like /images/logo.png or absolute)
   * @returns {Promise<string>} Base64 data URI
   */
  async resolveLogoPath(logoPath) {
    if (!logoPath) return '';

    // If it's already a full URL or data URI, return as is
    if (logoPath.startsWith('http://') || logoPath.startsWith('https://') || logoPath.startsWith('data:')) {
      return logoPath;
    }

    // If it's a relative path starting with /images/, convert to base64 data URI
    if (logoPath.startsWith('/images/')) {
      try {
        const publicPath = join(__dirname, '../../public');
        const absolutePath = join(publicPath, logoPath);

        // Read the image file
        const imageBuffer = await readFile(absolutePath);

        // Determine MIME type from file extension
        const ext = logoPath.toLowerCase().split('.').pop();
        const mimeTypes = {
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'gif': 'image/gif',
          'svg': 'image/svg+xml',
          'webp': 'image/webp'
        };
        const mimeType = mimeTypes[ext] || 'image/png';

        // Convert to base64 data URI
        const base64 = imageBuffer.toString('base64');
        return `data:${mimeType};base64,${base64}`;
      } catch (error) {
        logger.error('Failed to convert logo to base64', { error: error.message, logoPath });
        return ''; // Return empty string if file can't be read
      }
    }

    return logoPath;
  }

  /**
   * Get theme colors based on theme name
   * @param {string} theme - Theme name
   * @returns {Object} Theme colors
   */
  getThemeColors(theme) {
    // Theme colors matching svgTemplateService.js for consistency between preview and generate
    const themes = {
      'professional-blue': {
        header_bg: '#0F172A',        // Dark slate blue
        header_text_color: '#C7AB81',    // Gold - works great with white logo
        header_subtitle_color: '#E5D4BA', // Light gold
        footer_bg: '#0F172A',
        footer_text_color: '#FFFFFF',    // White for high contrast
        footer_date_color: '#C7AB81'     // Gold accent
      },
      'corporate-green': {
        header_bg: '#064E3B',        // Dark emerald green
        header_text_color: '#FFFFFF',    // White for crisp contrast
        header_subtitle_color: '#6EE7B7', // Light green
        footer_bg: '#064E3B',
        footer_text_color: '#FFFFFF',
        footer_date_color: '#6EE7B7'
      },
      'modern-purple': {
        header_bg: '#4C1D95',        // Deep purple
        header_text_color: '#FFFFFF',    // White for clarity
        header_subtitle_color: '#C4B5FD', // Light purple
        footer_bg: '#4C1D95',
        footer_text_color: '#FFFFFF',
        footer_date_color: '#C4B5FD'
      },
      'tech-orange': {
        header_bg: '#7C2D12',        // Deep orange-brown
        header_text_color: '#FFFFFF',    // White for maximum contrast
        header_subtitle_color: '#FED7AA', // Peach
        footer_bg: '#7C2D12',
        footer_text_color: '#FFFFFF',
        footer_date_color: '#FED7AA'
      },
      'monochrome': {
        header_bg: '#18181B',        // Almost black
        header_text_color: '#FFFFFF',    // Pure white
        header_subtitle_color: '#D4D4D8', // Light gray
        footer_bg: '#18181B',
        footer_text_color: '#FFFFFF',
        footer_date_color: '#D4D4D8'
      },
      'dark': {
        header_bg: '#0F172A',        // Same as professional-blue for consistency
        header_text_color: '#E0F2FE',    // Light blue
        header_subtitle_color: '#BAE6FD', // Sky blue
        footer_bg: '#0F172A',
        footer_text_color: '#FFFFFF',
        footer_date_color: '#BAE6FD'
      }
    };

    return themes[theme] || themes['professional-blue'];
  }

  /**
   * Get template description based on filename
   * @param {string} filename - Template filename
   * @returns {string} Template description
   */
  getTemplateDescription(filename) {
    const descriptions = {
      'template_vertical.svg': 'Template Vertical (Portrait)',
      'template_horizontal.svg': 'Template Horizontal (Landscape)',
      'madison_vertical.svg': 'Madison Portrait',
      'madison_horizontal.svg': 'Madison Landscape',
      'report_test.svg': 'Classic Data Layout',
      'iot-summary-report.svg': 'IoT Summary Report'
    };

    return descriptions[filename] || 'SVG Template';
  }
}

export default new ReportController();
