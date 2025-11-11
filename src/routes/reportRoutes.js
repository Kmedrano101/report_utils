/**
 * Report Routes
 * API endpoints for report generation
 */

import express from 'express';
import reportController from '../controllers/reportController.js';

const router = express.Router();

// Report generation endpoints
router.post('/iot-summary', reportController.generateIoTSummaryReport.bind(reportController));
router.post('/sensor-detailed', reportController.generateSensorDetailedReport.bind(reportController));
router.post('/building', reportController.generateBuildingReport.bind(reportController));

// Report management endpoints
router.get('/templates', reportController.getTemplates.bind(reportController));
router.get('/history', reportController.getReportHistory.bind(reportController));

export default router;
