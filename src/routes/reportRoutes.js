/**
 * Report Routes
 * API endpoints for report generation
 */

import express from 'express';
import reportController from '../controllers/reportController.js';

const router = express.Router();

// Report generation endpoints
router.post('/generate-pdf', reportController.generatePDFFromHTML.bind(reportController));
router.post('/key-metrics', reportController.generateKeyMetricsReport.bind(reportController));
router.post('/hotspots-coldzones', reportController.generateHotspotsColdzonesReport.bind(reportController));
router.post('/test-template', reportController.generateTestTemplateReport.bind(reportController));
router.post('/test-metrics', reportController.generateMetricsTestReport.bind(reportController));
router.post('/iot-summary', reportController.generateIoTSummaryReport.bind(reportController));
router.post('/sensor-detailed', reportController.generateSensorDetailedReport.bind(reportController));
router.post('/building', reportController.generateBuildingReport.bind(reportController));
router.post('/layout-preview', reportController.previewLayoutTemplate.bind(reportController));
router.post('/final-template', reportController.generateFinalTemplateReport.bind(reportController));

// Report management endpoints
router.get('/templates', reportController.getTemplates.bind(reportController));
router.get('/history', reportController.getReportHistory.bind(reportController));

// Report metrics endpoint
router.get('/metrics', reportController.getReportMetrics.bind(reportController));

export default router;
