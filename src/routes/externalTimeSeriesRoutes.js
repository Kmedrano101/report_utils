import express from 'express';
import victoriaMetricsService from '../services/victoriaMetricsService.js';
import logger from '../utils/logger.js';

const router = express.Router();

const SOURCE = 'external';

router.get('/status', async (req, res) => {
    try {
        const status = await victoriaMetricsService.checkHealth(SOURCE);
        res.json({
            success: status.healthy,
            ...status
        });
    } catch (error) {
        logger.error('External VictoriaMetrics status failed', { error: error.message });
        res.status(500).json({
            success: false,
            healthy: false,
            error: error.message
        });
    }
});

router.post('/query', async (req, res) => {
    try {
        const { query, time } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query parameter is required'
            });
        }

        const result = await victoriaMetricsService.query(query, { time, source: SOURCE });
        res.json(result);
    } catch (error) {
        logger.error('External VictoriaMetrics query failed', { error: error.message, body: req.body });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/query_range', async (req, res) => {
    try {
        const { query, start, end, step } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query parameter is required'
            });
        }

        if (!start) {
            return res.status(400).json({
                success: false,
                error: 'Start parameter is required for range queries'
            });
        }

        const result = await victoriaMetricsService.queryRange(query, {
            start,
            end,
            step,
            source: SOURCE
        });

        res.json(result);
    } catch (error) {
        logger.error('External VictoriaMetrics range query failed', { error: error.message, body: req.body });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
