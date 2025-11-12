/**
 * Report Controller
 * Handles report generation requests
 */

import iotDataService from '../services/iotDataService.js';
import svgTemplateService from '../services/svgTemplateService.js';
import pdfGenerationService from '../services/pdfGenerationService.js';
import database from '../config/database.js';
import logger from '../utils/logger.js';
import { parseISO, subDays } from 'date-fns';
import { readdir } from 'fs/promises';
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
