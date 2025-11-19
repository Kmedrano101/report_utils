/**
 * User Metrics Service
 * Custom user-defined reports with graphics and advanced analytics
 */

import logger from '../utils/logger.js';
import victoriaMetricsService from './victoriaMetricsService.js';

class UserMetricsService {
    constructor() {
        this.defaultSource = 'external';
    }

    /**
     * Hotspots and Cold Zones Report
     * Identifies minimum and maximum temperatures across all sensors
     * Returns top 3 hottest and top 3 coldest sensors
     *
     * @param {Object} params - Query parameters
     * @param {string} params.startDate - Start date (ISO format)
     * @param {string} params.endDate - End date (ISO format)
     * @param {string} params.source - Data source ('local' or 'external')
     * @returns {Promise<Object>} Hotspots and cold zones data
     */
    async getHotspotsAndColdZones(params) {
        const { startDate, endDate, source = this.defaultSource } = params;

        try {
            logger.info('Generating Hotspots and Cold Zones report', { startDate, endDate, source });

            // Get temperature data for all sensors
            const timeRange = this.getTimeRange(startDate, endDate);

            // Query to get average temperature per sensor
            const avgQuery = `avg_over_time(iot_sensor_reading{sensor_type="temperature"}[${timeRange}])`;
            const minQuery = `min_over_time(iot_sensor_reading{sensor_type="temperature"}[${timeRange}])`;
            const maxQuery = `max_over_time(iot_sensor_reading{sensor_type="temperature"}[${timeRange}])`;

            const [avgResult, minResult, maxResult] = await Promise.all([
                victoriaMetricsService.query(avgQuery, { time: endDate, source }),
                victoriaMetricsService.query(minQuery, { time: endDate, source }),
                victoriaMetricsService.query(maxQuery, { time: endDate, source })
            ]);

            // Process sensor data
            const sensorData = this.processSensorTemperatureData(avgResult, minResult, maxResult);

            // Sort to find hotspots (highest avg temp) and cold zones (lowest avg temp)
            const sortedByTemp = [...sensorData].sort((a, b) => b.avgTemp - a.avgTemp);

            // Get top 3 hottest and top 3 coldest
            const hotspots = sortedByTemp.slice(0, 3).map((sensor, index) => ({
                rank: index + 1,
                ...sensor,
                zone: 'hot'
            }));

            const coldZones = sortedByTemp.slice(-3).reverse().map((sensor, index) => ({
                rank: index + 1,
                ...sensor,
                zone: 'cold'
            }));

            // Calculate overall statistics
            const allTemps = sensorData.map(s => s.avgTemp);
            const allMinTemps = sensorData.map(s => s.minTemp);
            const allMaxTemps = sensorData.map(s => s.maxTemp);
            const overallAvg = allTemps.length > 0
                ? (allTemps.reduce((a, b) => a + b, 0) / allTemps.length).toFixed(1)
                : 0;
            // Use actual min/max temperatures to match key metrics (temp_min/temp_max)
            const overallMin = allMinTemps.length > 0 ? Math.min(...allMinTemps).toFixed(1) : 0;
            const overallMax = allMaxTemps.length > 0 ? Math.max(...allMaxTemps).toFixed(1) : 0;
            const tempRange = (parseFloat(overallMax) - parseFloat(overallMin)).toFixed(1);

            // Generate chart data for visualization
            const chartData = this.generateTemperatureChartData(sensorData, hotspots, coldZones);

            const report = {
                reportName: 'Hotspots and Cold Zones',
                reportType: 'temperature-analysis',
                dateRange: `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`,
                generatedAt: new Date().toISOString(),

                // Summary statistics
                summary: {
                    totalSensors: sensorData.length,
                    overallAvgTemp: overallAvg,
                    overallMinTemp: overallMin,
                    overallMaxTemp: overallMax,
                    temperatureRange: tempRange
                },

                // Hotspots (3 highest temperature sensors)
                hotspots: hotspots.map(h => ({
                    rank: h.rank,
                    sensorName: h.sensorName,
                    sensorId: h.sensorId,
                    avgTemperature: h.avgTemp.toFixed(1),
                    minTemperature: h.minTemp.toFixed(1),
                    maxTemperature: h.maxTemp.toFixed(1),
                    deviation: (h.avgTemp - parseFloat(overallAvg)).toFixed(1),
                    status: this.getTemperatureStatus(h.avgTemp, 'hot')
                })),

                // Cold zones (3 lowest temperature sensors)
                coldZones: coldZones.map(c => ({
                    rank: c.rank,
                    sensorName: c.sensorName,
                    sensorId: c.sensorId,
                    avgTemperature: c.avgTemp.toFixed(1),
                    minTemperature: c.minTemp.toFixed(1),
                    maxTemperature: c.maxTemp.toFixed(1),
                    deviation: (c.avgTemp - parseFloat(overallAvg)).toFixed(1),
                    status: this.getTemperatureStatus(c.avgTemp, 'cold')
                })),

                // Chart data for graphics
                chartData: chartData,

                // All sensor temperatures for heatmap
                allSensors: sensorData.map(s => ({
                    sensorName: s.sensorName,
                    sensorId: s.sensorId,
                    avgTemperature: s.avgTemp.toFixed(1),
                    minTemperature: s.minTemp.toFixed(1),
                    maxTemperature: s.maxTemp.toFixed(1)
                }))
            };

            logger.info('Hotspots and Cold Zones report generated successfully', {
                totalSensors: sensorData.length,
                hotspots: hotspots.length,
                coldZones: coldZones.length
            });

            return report;

        } catch (error) {
            logger.error('Failed to generate Hotspots and Cold Zones report', {
                error: error.message,
                params
            });
            throw error;
        }
    }

    /**
     * Process raw VictoriaMetrics data into sensor temperature objects
     * Only includes sensors with names t1 to t30 (excludes s1, s4, etc.)
     */
    processSensorTemperatureData(avgResult, minResult, maxResult) {
        const sensorMap = new Map();

        // Regex to match only t1 to t30 sensor names
        const validSensorPattern = /^t([1-9]|[12][0-9]|30)$/i;

        // Process average temperatures
        if (avgResult.data?.result) {
            avgResult.data.result.forEach(item => {
                const sensorName = item.metric?.sensor_name || 'Unknown';
                const sensorId = item.metric?.sensor_id || sensorName;
                const avgTemp = parseFloat(item.values?.[0] || 0);

                // Only include sensors matching t1-t30 pattern
                if (!validSensorPattern.test(sensorName)) {
                    return;
                }

                sensorMap.set(sensorName, {
                    sensorName,
                    sensorId,
                    avgTemp,
                    minTemp: 0,
                    maxTemp: 0
                });
            });
        }

        // Add minimum temperatures
        if (minResult.data?.result) {
            minResult.data.result.forEach(item => {
                const sensorName = item.metric?.sensor_name || 'Unknown';
                const minTemp = parseFloat(item.values?.[0] || 0);

                if (sensorMap.has(sensorName)) {
                    sensorMap.get(sensorName).minTemp = minTemp;
                }
            });
        }

        // Add maximum temperatures
        if (maxResult.data?.result) {
            maxResult.data.result.forEach(item => {
                const sensorName = item.metric?.sensor_name || 'Unknown';
                const maxTemp = parseFloat(item.values?.[0] || 0);

                if (sensorMap.has(sensorName)) {
                    sensorMap.get(sensorName).maxTemp = maxTemp;
                }
            });
        }

        return Array.from(sensorMap.values());
    }

    /**
     * Generate chart data for temperature visualization
     */
    generateTemperatureChartData(allSensors, hotspots, coldZones) {
        // Bar chart data - all sensors sorted by temperature
        const sortedSensors = [...allSensors].sort((a, b) => b.avgTemp - a.avgTemp);

        const barChart = {
            type: 'bar',
            labels: sortedSensors.map(s => s.sensorName),
            datasets: [{
                label: 'Average Temperature (°C)',
                data: sortedSensors.map(s => s.avgTemp),
                backgroundColor: sortedSensors.map(s => {
                    // Color gradient: red for hot, blue for cold
                    const isHot = hotspots.some(h => h.sensorName === s.sensorName);
                    const isCold = coldZones.some(c => c.sensorName === s.sensorName);
                    if (isHot) return 'rgba(239, 68, 68, 0.8)';  // Red
                    if (isCold) return 'rgba(59, 130, 246, 0.8)'; // Blue
                    return 'rgba(156, 163, 175, 0.6)'; // Gray
                }),
                borderColor: sortedSensors.map(s => {
                    const isHot = hotspots.some(h => h.sensorName === s.sensorName);
                    const isCold = coldZones.some(c => c.sensorName === s.sensorName);
                    if (isHot) return 'rgb(239, 68, 68)';
                    if (isCold) return 'rgb(59, 130, 246)';
                    return 'rgb(156, 163, 175)';
                }),
                borderWidth: 1
            }]
        };

        // Comparison chart for hotspots vs cold zones
        const comparisonChart = {
            type: 'horizontalBar',
            labels: [
                ...hotspots.map(h => `🔥 ${h.sensorName}`),
                ...coldZones.map(c => `❄️ ${c.sensorName}`)
            ],
            datasets: [{
                label: 'Temperature (°C)',
                data: [
                    ...hotspots.map(h => h.avgTemp),
                    ...coldZones.map(c => c.avgTemp)
                ],
                backgroundColor: [
                    ...hotspots.map(() => 'rgba(239, 68, 68, 0.8)'),
                    ...coldZones.map(() => 'rgba(59, 130, 246, 0.8)')
                ],
                borderColor: [
                    ...hotspots.map(() => 'rgb(239, 68, 68)'),
                    ...coldZones.map(() => 'rgb(59, 130, 246)')
                ],
                borderWidth: 1
            }]
        };

        // Min/Max range chart
        const rangeChart = {
            type: 'scatter',
            labels: [...hotspots, ...coldZones].map(s => s.sensorName),
            datasets: [
                {
                    label: 'Max Temperature',
                    data: [...hotspots, ...coldZones].map(s => ({ x: s.sensorName, y: s.maxTemp })),
                    backgroundColor: 'rgba(239, 68, 68, 0.6)',
                    pointStyle: 'triangle'
                },
                {
                    label: 'Avg Temperature',
                    data: [...hotspots, ...coldZones].map(s => ({ x: s.sensorName, y: s.avgTemp })),
                    backgroundColor: 'rgba(251, 191, 36, 0.8)',
                    pointStyle: 'circle'
                },
                {
                    label: 'Min Temperature',
                    data: [...hotspots, ...coldZones].map(s => ({ x: s.sensorName, y: s.minTemp })),
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    pointStyle: 'rectRot'
                }
            ]
        };

        return {
            barChart,
            comparisonChart,
            rangeChart
        };
    }

    /**
     * Get temperature status label
     */
    getTemperatureStatus(temp, zone) {
        if (zone === 'hot') {
            if (temp >= 30) return 'Critical High';
            if (temp >= 25) return 'Warning High';
            return 'Normal High';
        } else {
            if (temp <= 10) return 'Critical Low';
            if (temp <= 15) return 'Warning Low';
            return 'Normal Low';
        }
    }

    /**
     * Calculate time range for VictoriaMetrics queries
     */
    getTimeRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const durationMs = end - start;

        const durationSeconds = Math.floor(durationMs / 1000);
        const durationMinutes = Math.floor(durationSeconds / 60);
        const durationHours = Math.floor(durationMinutes / 60);
        const durationDays = Math.floor(durationHours / 24);

        if (durationDays > 0) {
            return `${durationDays}d`;
        } else if (durationHours > 0) {
            return `${durationHours}h`;
        } else if (durationMinutes > 0) {
            return `${durationMinutes}m`;
        } else {
            return `${durationSeconds}s`;
        }
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }
}

export default new UserMetricsService();
