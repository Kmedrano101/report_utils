/**
 * Report Controller
 * Handles report generation requests
 */

import iotDataService from '../services/iotDataService.js';
import svgTemplateService from '../services/svgTemplateService.js';
import pdfGenerationService from '../services/pdfGenerationService.js';
import reportMetricsService from '../services/reportMetricsService.js';
import userMetricsService from '../services/userMetricsService.js';
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
   * Generate Hotspots and Cold Zones report
   * POST /api/reports/hotspots-coldzones
   */
  async generateHotspotsColdzonesReport(req, res) {
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
        headerTitle = 'Hotspots and Cold Zones',
        headerSubtitle = 'Temperature Analysis Report',
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

      logger.info('Generating Hotspots and Cold Zones report', { startDate, endDate, layout, pageSize, format, source, theme });

      // Fetch base metrics from VictoriaMetrics
      const baseMetrics = await reportMetricsService.getReportMetrics({
        startDate,
        endDate,
        source
      });

      // Fetch hotspots and cold zones data
      const hotspotsData = await userMetricsService.getHotspotsAndColdZones({
        startDate,
        endDate,
        source
      });

      logger.info('Hotspots and Cold Zones data fetched successfully', {
        hotspots: hotspotsData.hotspots?.length,
        coldZones: hotspotsData.coldZones?.length
      });

      // Determine which template to use based on layout
      const normalizedLayout = layout.toLowerCase();
      const templateName = normalizedLayout === 'landscape' || normalizedLayout === 'horizontal'
        ? 'report_horizontal_1.svg'
        : 'report_vertical_1.svg';

      // Apply theme colors
      const themeColors = this.getThemeColors(theme);

      // Resolve logo path to base64 data URI for Puppeteer
      const resolvedLogoUrl = await this.resolveLogoPath(logoUrl);

      // Resolve thermometer image to base64 data URI for Puppeteer
      const resolvedThermometerUrl = await this.resolveLogoPath('/images/termometer.png');

      // Prepare template data with base metrics and hotspots/cold zones
      const templateData = {
        // Header (from template configuration)
        header_title: headerTitle,
        header_subtitle: headerSubtitle,
        header_bg: themeColors.header_bg,
        header_text_color: themeColors.header_text_color,
        header_subtitle_color: themeColors.header_subtitle_color,
        logo_url: resolvedLogoUrl,

        // Thermometer image
        thermometer_url: resolvedThermometerUrl,

        // Base metrics from VictoriaMetrics
        ...baseMetrics,

        // Building name
        building_name: 'Madison Arena',

        // Footer (from template configuration)
        footer_text: footerText,
        footer_bg: themeColors.footer_bg,
        footer_text_color: themeColors.footer_text_color,
        footer_date_color: themeColors.footer_date_color,

        // Content body theme colors
        section_header_color: themeColors.section_header_color,
        metric_value_color: themeColors.metric_value_color,
        metric_title_color: themeColors.metric_title_color,
        table_text_color: themeColors.table_text_color,
        table_header_color: themeColors.table_header_color,
        card_border_color: themeColors.card_border_color,
        accent_primary: themeColors.accent_primary,
        accent_secondary: themeColors.accent_secondary,

        // Temperature summary
        temperature_range: hotspotsData.summary?.temperatureRange || '0',
        overall_avg_temp: hotspotsData.summary?.overallAvgTemp || '0',
        overall_min_temp: hotspotsData.summary?.overallMinTemp || '0',
        overall_max_temp: hotspotsData.summary?.overallMaxTemp || '0',

        // Hotspots data (top 3)
        hotspot_1_name: hotspotsData.hotspots?.[0]?.sensorName || 'N/A',
        hotspot_1_avg: hotspotsData.hotspots?.[0]?.avgTemperature || '0',
        hotspot_1_min: hotspotsData.hotspots?.[0]?.minTemperature || '0',
        hotspot_1_max: hotspotsData.hotspots?.[0]?.maxTemperature || '0',
        hotspot_1_deviation: hotspotsData.hotspots?.[0]?.deviation || '0',

        hotspot_2_name: hotspotsData.hotspots?.[1]?.sensorName || 'N/A',
        hotspot_2_avg: hotspotsData.hotspots?.[1]?.avgTemperature || '0',
        hotspot_2_min: hotspotsData.hotspots?.[1]?.minTemperature || '0',
        hotspot_2_max: hotspotsData.hotspots?.[1]?.maxTemperature || '0',
        hotspot_2_deviation: hotspotsData.hotspots?.[1]?.deviation || '0',

        hotspot_3_name: hotspotsData.hotspots?.[2]?.sensorName || 'N/A',
        hotspot_3_avg: hotspotsData.hotspots?.[2]?.avgTemperature || '0',
        hotspot_3_min: hotspotsData.hotspots?.[2]?.minTemperature || '0',
        hotspot_3_max: hotspotsData.hotspots?.[2]?.maxTemperature || '0',
        hotspot_3_deviation: hotspotsData.hotspots?.[2]?.deviation || '0',

        // Cold zones data (top 3)
        coldzone_1_name: hotspotsData.coldZones?.[0]?.sensorName || 'N/A',
        coldzone_1_avg: hotspotsData.coldZones?.[0]?.avgTemperature || '0',
        coldzone_1_min: hotspotsData.coldZones?.[0]?.minTemperature || '0',
        coldzone_1_max: hotspotsData.coldZones?.[0]?.maxTemperature || '0',
        coldzone_1_deviation: hotspotsData.coldZones?.[0]?.deviation || '0',

        coldzone_2_name: hotspotsData.coldZones?.[1]?.sensorName || 'N/A',
        coldzone_2_avg: hotspotsData.coldZones?.[1]?.avgTemperature || '0',
        coldzone_2_min: hotspotsData.coldZones?.[1]?.minTemperature || '0',
        coldzone_2_max: hotspotsData.coldZones?.[1]?.maxTemperature || '0',
        coldzone_2_deviation: hotspotsData.coldZones?.[1]?.deviation || '0',

        coldzone_3_name: hotspotsData.coldZones?.[2]?.sensorName || 'N/A',
        coldzone_3_avg: hotspotsData.coldZones?.[2]?.avgTemperature || '0',
        coldzone_3_min: hotspotsData.coldZones?.[2]?.minTemperature || '0',
        coldzone_3_max: hotspotsData.coldZones?.[2]?.maxTemperature || '0',
        coldzone_3_deviation: hotspotsData.coldZones?.[2]?.deviation || '0',

        // Status info
        last_update_time: new Date().toLocaleString('es-ES')
      };

      logger.info('Generating report with template', { templateName, layout: normalizedLayout });

      // Load and process template
      const templateContent = await svgTemplateService.loadTemplate(templateName);
      const svgContent = svgTemplateService.replacePlaceholders(templateContent, templateData);

      // Prepare HTML generation options
      const htmlOptions = {
        layout: normalizedLayout === 'landscape' || normalizedLayout === 'horizontal' ? 'landscape' : 'portrait',
        pageSize: pageSize.toUpperCase(),
        chartType: 'temperature-comparison'
      };

      // Prepare chart data for temperature comparison chart
      const chartData = hotspotsData.chartData?.comparisonChart || null;

      if (format === 'html') {
        const htmlContent = svgTemplateService.generateHtmlWithSvg(svgContent, chartData, htmlOptions);
        return res.send(htmlContent);
      }

      // Generate PDF
      const pdfOptions = {
        landscape: normalizedLayout === 'landscape' || normalizedLayout === 'horizontal',
        pageSize: pageSize.toUpperCase()
      };

      const pdfBuffer = await pdfGenerationService.generatePdfFromHtml(
        svgTemplateService.generateHtmlWithSvg(svgContent, chartData, htmlOptions),
        pdfOptions
      );

      const duration = Date.now() - startTime;
      logger.info('Hotspots and Cold Zones report generated successfully', {
        format,
        layout: normalizedLayout,
        pageSize,
        duration: `${duration}ms`,
        size: `${(pdfBuffer.length / 1024).toFixed(2)} KB`
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="hotspots-coldzones-report-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.end(pdfBuffer, 'binary');

    } catch (error) {
      logger.error('Failed to generate Hotspots and Cold Zones report', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Generate Power Consumption Analysis report
   * POST /api/reports/power-consumption
   */
  async generatePowerConsumptionReport(req, res) {
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
        headerTitle = 'Power Consumption Analysis',
        headerSubtitle = 'Energy Monitoring Report',
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

      logger.info('Generating Power Consumption Analysis report', { startDate, endDate, layout, pageSize, format, source, theme });

      // Fetch base metrics from VictoriaMetrics
      const baseMetrics = await reportMetricsService.getReportMetrics({
        startDate,
        endDate,
        source
      });

      // Fetch power consumption analysis data
      const powerData = await userMetricsService.getPowerConsumptionAnalysis({
        startDate,
        endDate,
        source
      });

      logger.info('Power Consumption Analysis data fetched successfully', {
        totalKwh: powerData.total_kwh,
        totalCost: powerData.total_cost
      });

      // Determine which template to use based on layout
      const normalizedLayout = layout.toLowerCase();
      const templateName = normalizedLayout === 'landscape' || normalizedLayout === 'horizontal'
        ? 'report_horizontal_2.svg'
        : 'report_vertical_2.svg';

      // Apply theme colors
      const themeColors = this.getThemeColors(theme);

      // Resolve logo path to base64 data URI for Puppeteer
      const resolvedLogoUrl = await this.resolveLogoPath(logoUrl);

      // Resolve electric image to base64 data URI for Puppeteer
      const resolvedElectricUrl = await this.resolveLogoPath('/images/electric.png');

      // Prepare template data with base metrics and power consumption data
      const templateData = {
        // Header (from template configuration)
        header_title: headerTitle,
        header_subtitle: headerSubtitle,
        header_bg: themeColors.header_bg,
        header_text_color: themeColors.header_text_color,
        header_subtitle_color: themeColors.header_subtitle_color,
        logo_url: resolvedLogoUrl,

        // Electric image
        electric_url: resolvedElectricUrl,

        // Base metrics from VictoriaMetrics (for key metrics cards)
        ...baseMetrics,

        // Building name
        building_name: 'Madison Arena',

        // Footer (from template configuration)
        footer_text: footerText,
        footer_bg: themeColors.footer_bg,
        footer_text_color: themeColors.footer_text_color,
        footer_date_color: themeColors.footer_date_color,

        // Content body theme colors
        section_header_color: themeColors.section_header_color,
        metric_value_color: themeColors.metric_value_color,
        metric_title_color: themeColors.metric_title_color,
        table_text_color: themeColors.table_text_color,
        table_header_color: themeColors.table_header_color,
        card_border_color: themeColors.card_border_color,
        accent_primary: themeColors.accent_primary,
        accent_secondary: themeColors.accent_secondary,

        // Power consumption data
        ...powerData,

        // Status info
        last_update_time: new Date().toLocaleString('es-ES')
      };

      logger.info('Generating report with template', { templateName, layout: normalizedLayout });

      // Load and process template
      const templateContent = await svgTemplateService.loadTemplate(templateName);
      const svgContent = svgTemplateService.replacePlaceholders(templateContent, templateData);

      // Prepare HTML generation options
      const htmlOptions = {
        layout: normalizedLayout === 'landscape' || normalizedLayout === 'horizontal' ? 'landscape' : 'portrait',
        pageSize: pageSize.toUpperCase(),
        chartType: 'consumption-comparison'
      };

      // Prepare chart data for consumption comparison chart
      const chartData = powerData.chartData || null;

      if (format === 'html') {
        const htmlContent = svgTemplateService.generateHtmlWithSvg(svgContent, chartData, htmlOptions);
        return res.send(htmlContent);
      }

      // Generate PDF
      const pdfOptions = {
        landscape: normalizedLayout === 'landscape' || normalizedLayout === 'horizontal',
        pageSize: pageSize.toUpperCase()
      };

      const pdfBuffer = await pdfGenerationService.generatePdfFromHtml(
        svgTemplateService.generateHtmlWithSvg(svgContent, chartData, htmlOptions),
        pdfOptions
      );

      const duration = Date.now() - startTime;
      logger.info('Power Consumption Analysis report generated successfully', {
        format,
        layout: normalizedLayout,
        pageSize,
        duration: `${duration}ms`,
        size: `${(pdfBuffer.length / 1024).toFixed(2)} KB`
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="power-consumption-report-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.end(pdfBuffer, 'binary');

    } catch (error) {
      logger.error('Failed to generate Power Consumption Analysis report', { error: error.message, stack: error.stack });
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
        footer_date_color: '#C7AB81',    // Gold accent
        // Content body colors
        section_header_color: '#0F172A',  // Match header for hierarchy
        metric_value_color: '#0F172A',    // Primary text
        metric_title_color: '#475569',    // Muted for labels
        table_text_color: '#334155',      // Body text
        table_header_color: '#475569',    // Table headers
        card_border_color: '#CBD5E1',     // Card borders
        accent_primary: '#C7AB81',        // Gold accent
        accent_secondary: '#0F172A'       // Secondary accent
      },
      'corporate-green': {
        header_bg: '#064E3B',        // Dark emerald green
        header_text_color: '#FFFFFF',    // White for crisp contrast
        header_subtitle_color: '#6EE7B7', // Light green
        footer_bg: '#064E3B',
        footer_text_color: '#FFFFFF',
        footer_date_color: '#6EE7B7',
        // Content body colors
        section_header_color: '#064E3B',
        metric_value_color: '#064E3B',
        metric_title_color: '#065F46',
        table_text_color: '#047857',
        table_header_color: '#065F46',
        card_border_color: '#A7F3D0',
        accent_primary: '#10B981',
        accent_secondary: '#064E3B'
      },
      'modern-purple': {
        header_bg: '#4C1D95',        // Deep purple
        header_text_color: '#FFFFFF',    // White for clarity
        header_subtitle_color: '#C4B5FD', // Light purple
        footer_bg: '#4C1D95',
        footer_text_color: '#FFFFFF',
        footer_date_color: '#C4B5FD',
        // Content body colors
        section_header_color: '#4C1D95',
        metric_value_color: '#4C1D95',
        metric_title_color: '#6D28D9',
        table_text_color: '#7C3AED',
        table_header_color: '#6D28D9',
        card_border_color: '#DDD6FE',
        accent_primary: '#A78BFA',
        accent_secondary: '#4C1D95'
      },
      'tech-orange': {
        header_bg: '#7C2D12',        // Deep orange-brown
        header_text_color: '#FFFFFF',    // White for maximum contrast
        header_subtitle_color: '#FED7AA', // Peach
        footer_bg: '#7C2D12',
        footer_text_color: '#FFFFFF',
        footer_date_color: '#FED7AA',
        // Content body colors
        section_header_color: '#7C2D12',
        metric_value_color: '#7C2D12',
        metric_title_color: '#9A3412',
        table_text_color: '#C2410C',
        table_header_color: '#9A3412',
        card_border_color: '#FED7AA',
        accent_primary: '#FB923C',
        accent_secondary: '#7C2D12'
      },
      'monochrome': {
        header_bg: '#18181B',        // Almost black
        header_text_color: '#FFFFFF',    // Pure white
        header_subtitle_color: '#D4D4D8', // Light gray
        footer_bg: '#18181B',
        footer_text_color: '#FFFFFF',
        footer_date_color: '#D4D4D8',
        // Content body colors
        section_header_color: '#18181B',
        metric_value_color: '#18181B',
        metric_title_color: '#3F3F46',
        table_text_color: '#52525B',
        table_header_color: '#3F3F46',
        card_border_color: '#D4D4D8',
        accent_primary: '#71717A',
        accent_secondary: '#18181B'
      },
      'dark': {
        header_bg: '#0F172A',        // Same as professional-blue for consistency
        header_text_color: '#E0F2FE',    // Light blue
        header_subtitle_color: '#BAE6FD', // Sky blue
        footer_bg: '#0F172A',
        footer_text_color: '#FFFFFF',
        footer_date_color: '#BAE6FD',
        // Content body colors
        section_header_color: '#0F172A',
        metric_value_color: '#0F172A',
        metric_title_color: '#334155',
        table_text_color: '#475569',
        table_header_color: '#334155',
        card_border_color: '#94A3B8',
        accent_primary: '#38BDF8',
        accent_secondary: '#0F172A'
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
