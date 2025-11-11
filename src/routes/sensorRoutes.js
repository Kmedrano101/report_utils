/**
 * Sensor Routes
 * API endpoints for sensor data queries
 */

import express from 'express';
import sensorController from '../controllers/sensorController.js';

const router = express.Router();

// Sensor query endpoints
router.get('/', sensorController.getSensors.bind(sensorController));
router.get('/types', sensorController.getSensorTypes.bind(sensorController));
router.get('/:id', sensorController.getSensorById.bind(sensorController));
router.get('/:id/readings', sensorController.getSensorReadings.bind(sensorController));
router.get('/:id/statistics', sensorController.getSensorStatistics.bind(sensorController));

// Sensor comparison
router.post('/compare', sensorController.compareSensors.bind(sensorController));

export default router;
