/**
 * Metrics Routes
 * Endpoints for VictoriaMetrics status and queries
 */

import express from 'express';
import logger from '../utils/logger.js';

const router = express.Router();

// VictoriaMetrics configuration
const VICTORIA_METRICS_URL = process.env.VICTORIA_METRICS_URL || 'http://localhost:8428';

/**
 * GET /api/metrics/status
 * Get VictoriaMetrics health and status
 */
router.get('/status', async (req, res) => {
    try {
        // Check health endpoint
        const healthResponse = await fetch(`${VICTORIA_METRICS_URL}/health`);

        if (!healthResponse.ok) {
            return res.json({
                success: false,
                healthy: false,
                error: 'VictoriaMetrics health check failed',
                url: VICTORIA_METRICS_URL
            });
        }

        // Get metrics list
        let metricCount = 0;
        try {
            const metricsResponse = await fetch(`${VICTORIA_METRICS_URL}/api/v1/label/__name__/values`);
            if (metricsResponse.ok) {
                const metricsData = await metricsResponse.json();
                metricCount = metricsData.data ? metricsData.data.length : 0;
            }
        } catch (e) {
            logger.warn('Failed to get metrics count', { error: e.message });
        }

        res.json({
            success: true,
            healthy: true,
            url: VICTORIA_METRICS_URL,
            metricCount,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('VictoriaMetrics status check failed', { error: error.message });
        res.json({
            success: false,
            healthy: false,
            error: error.message,
            url: VICTORIA_METRICS_URL
        });
    }
});

/**
 * GET /api/metrics/query
 * Proxy queries to VictoriaMetrics
 */
router.get('/query', async (req, res) => {
    try {
        const { query, time, start, end, step } = req.query;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query parameter is required'
            });
        }

        // Build query URL
        const params = new URLSearchParams({ query });
        if (time) params.append('time', time);
        if (start) params.append('start', start);
        if (end) params.append('end', end);
        if (step) params.append('step', step);

        const endpoint = start && end ? 'query_range' : 'query';
        const url = `${VICTORIA_METRICS_URL}/api/v1/${endpoint}?${params.toString()}`;

        const response = await fetch(url);
        const data = await response.json();

        res.json({
            success: response.ok,
            data: data.data || data,
            status: data.status
        });

    } catch (error) {
        logger.error('VictoriaMetrics query failed', { error: error.message, query: req.query });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
