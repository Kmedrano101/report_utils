/**
 * KPI Routes
 * API endpoints for KPI calculations
 */

import express from 'express';
import kpiController from '../controllers/kpiController.js';

const router = express.Router();

// KPI endpoints
router.get('/', kpiController.getAllKPIs.bind(kpiController));
router.get('/:name', kpiController.getKPI.bind(kpiController));

export default router;
