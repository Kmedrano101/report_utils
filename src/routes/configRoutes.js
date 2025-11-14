/**
 * Configuration Routes
 * API endpoints for configuration management
 */

import express from 'express';
import configController from '../controllers/configController.js';

const router = express.Router();

// Database configuration endpoints
router.post('/test-connection', configController.testConnection.bind(configController));
router.post('/detect-schema', configController.detectSchema.bind(configController));
router.post('/database', configController.saveConfiguration.bind(configController));
router.get('/database', configController.listConfigurations.bind(configController));
router.get('/database/:name', configController.getConfiguration.bind(configController));
router.delete('/database/:name', configController.deleteConfiguration.bind(configController));

// Import/Export
router.get('/export/:name', configController.exportConfiguration.bind(configController));
router.post('/import', configController.importConfiguration.bind(configController));

// VictoriaMetrics configuration
router.post('/victoriametrics', configController.saveVictoriaMetricsConfig.bind(configController));

// Update .env database configuration
router.post('/database-env', configController.updateDatabaseEnv.bind(configController));

export default router;
