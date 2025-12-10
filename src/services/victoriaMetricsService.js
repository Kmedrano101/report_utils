/**
 * VictoriaMetrics Service
 * Handles connections to both local and external VictoriaMetrics instances
 */

import logger from '../utils/logger.js';
import config from '../config/index.js';

class VictoriaMetricsService {
    constructor() {
        this.externalUrl = config.victoriaMetrics.externalUrl;
        this.externalToken = config.victoriaMetrics.externalToken;
        this.defaultSource = 'external';
    }

    /**
     * Parse simplified time ranges like "1d", "7d", "1h" to ISO timestamps
     * @param {string} timeRange - Simplified time range (e.g., "1d", "7d", "1h")
     * @returns {string} ISO timestamp
     */
    parseTimeRange(timeRange) {
        const now = new Date();
        const match = timeRange.match(/^(\d+)([smhdw])$/);

        if (!match) {
            return timeRange;
        }

        const [, value, unit] = match;
        const amount = parseInt(value, 10);

        const units = {
            's': amount * 1000,
            'm': amount * 60 * 1000,
            'h': amount * 60 * 60 * 1000,
            'd': amount * 24 * 60 * 60 * 1000,
            'w': amount * 7 * 24 * 60 * 60 * 1000
        };

        const timestamp = new Date(now.getTime() - units[unit]);
        return timestamp.toISOString();
    }

    /**
     * Check health of VictoriaMetrics instance
     * @returns {Promise<Object>} Health status
     */
    async checkHealth() {
        try {
            const baseUrl = this.externalUrl;

            if (!baseUrl) {
                throw new Error('VictoriaMetrics URL not configured');
            }

            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${this.externalToken}`
                },
                body: JSON.stringify({
                    query: 'iot_sensor_reading',
                    time: new Date().toISOString()
                })
            };

            const response = await fetch(`${baseUrl}/query`, options);

            if (!response.ok) {
                return {
                    healthy: false,
                    source: 'external',
                    url: baseUrl,
                    error: `Health check failed with status ${response.status}`
                };
            }

            let metricCount = 0;
            try {
                const data = await response.json();
                metricCount = data.result ? data.result.length : 0;
            } catch (e) {
                logger.warn('Failed to get metrics count', { error: e.message });
            }

            return {
                healthy: true,
                source: 'external',
                url: baseUrl,
                metricCount,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('VictoriaMetrics health check failed', { error: error.message, url: this.externalUrl });
            return {
                healthy: false,
                source: 'external',
                url: this.externalUrl,
                error: error.message
            };
        }
    }

    /**
     * Execute instant query
     * @param {string} query - MetricsQL query
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Query results
     */
    async query(query, options = {}) {
        const { time = new Date().toISOString() } = options;

        try {
            const baseUrl = this.externalUrl;

            if (!baseUrl) {
                throw new Error('VictoriaMetrics URL not configured');
            }

            const response = await fetch(`${baseUrl}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${this.externalToken}`
                },
                body: JSON.stringify({
                    query,
                    time: this.parseTimeRange(time)
                })
            });

            const data = await response.json();

            return {
                success: response.ok,
                source: 'external',
                data: data.data || data,
                status: data.status
            };

        } catch (error) {
            logger.error('VictoriaMetrics query failed', { error: error.message, query });
            throw error;
        }
    }

    /**
     * Execute range query
     * @param {string} query - MetricsQL query
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Query results
     */
    async queryRange(query, options = {}) {
        const {
            start,
            end = new Date().toISOString(),
            step = '1h'
        } = options;

        if (!start) {
            throw new Error('start parameter is required for range queries');
        }

        try {
            const baseUrl = this.externalUrl;

            if (!baseUrl) {
                throw new Error('VictoriaMetrics URL not configured');
            }

            const response = await fetch(`${baseUrl}/query_range`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${this.externalToken}`
                },
                body: JSON.stringify({
                    query,
                    start: this.parseTimeRange(start),
                    end: this.parseTimeRange(end),
                    step
                })
            });

            const data = await response.json();

            return {
                success: response.ok,
                source: 'external',
                data: data.data || data,
                status: data.status
            };

        } catch (error) {
            logger.error('VictoriaMetrics range query failed', { error: error.message, query });
            throw error;
        }
    }

    /**
     * List all metric names
     * @returns {Promise<Array>} List of metric names
     */
    async listMetrics() {
        try {
            const baseUrl = this.externalUrl;

            if (!baseUrl) {
                throw new Error('VictoriaMetrics URL not configured');
            }

            const response = await fetch(`${baseUrl}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${this.externalToken}`
                },
                body: JSON.stringify({
                    query: '{__name__!=""}'
                })
            });

            const data = await response.json();
            const metrics = new Set();

            data.data?.result?.forEach(result => {
                if (result.metric?.__name__) {
                    metrics.add(result.metric.__name__);
                }
            });

            return Array.from(metrics).sort();

        } catch (error) {
            logger.error('Failed to list metrics', { error: error.message });
            throw error;
        }
    }

    /**
     * Get label values for a specific label
     * @param {string} label - Label name
     * @returns {Promise<Array>} List of label values
     */
    async getLabelValues(label) {
        try {
            const baseUrl = this.externalUrl;

            if (!baseUrl) {
                throw new Error('VictoriaMetrics URL not configured');
            }

            const response = await fetch(`${baseUrl}/api/v1/label/${label}/values`, {
                headers: {
                    'Authorization': `Basic ${this.externalToken}`
                }
            });

            const data = await response.json();
            return data.data || [];

        } catch (error) {
            logger.error('Failed to get label values', { error: error.message, label });
            throw error;
        }
    }

    /**
     * Update VictoriaMetrics configuration and test connection
     * @param {Object} newConfig - New configuration
     * @returns {Promise<Object>} Connection test result
     */
    async updateConfig(newConfig) {
        try {
            // Update configuration
            this.externalUrl = newConfig.url;
            this.externalToken = newConfig.token;

            logger.info('VictoriaMetrics configuration updated', {
                url: newConfig.url
            });

            // Test the connection
            const healthResult = await this.checkHealth();

            if (healthResult.healthy) {
                logger.info('VictoriaMetrics connection successful');
                return {
                    success: true,
                    connected: true,
                    health: healthResult
                };
            } else {
                logger.warn('VictoriaMetrics connection failed', { error: healthResult.error });
                return {
                    success: true,
                    connected: false,
                    error: healthResult.error
                };
            }
        } catch (error) {
            logger.error('Failed to update VictoriaMetrics config', { error: error.message });
            return {
                success: false,
                connected: false,
                error: error.message
            };
        }
    }
}

export default new VictoriaMetricsService();
