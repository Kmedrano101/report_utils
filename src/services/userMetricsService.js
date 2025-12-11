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
        const { startDate, endDate, source = this.defaultSource, locale = 'es-ES' } = params;

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

            // Generate trends chart data (time-series for warmest and coldest sensors)
            // Always use top warmest and coldest sensors, even if they don't meet hotspot/coldzone thresholds
            const warmestSensor = hotspots.length > 0 ? hotspots[0] : (sensorData.length > 0 ? sensorData[0] : null);
            const coldestSensor = coldZones.length > 0 ? coldZones[0] : (sensorData.length > 0 ? sensorData[sensorData.length - 1] : null);

            const trendsChartData = await this.generateTrendsChartData(
                startDate,
                endDate,
                source,
                warmestSensor,
                coldestSensor,
                overallAvg,
                locale
            );

            const report = {
                reportName: 'Hotspots and Cold Zones',
                reportType: 'temperature-analysis',
                dateRange: `${this.formatDate(startDate, locale)} - ${this.formatDate(endDate, locale)}`,
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
                chartData: {
                    ...chartData,
                    trendsChart: trendsChartData
                },

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
     * Generate trends chart data (time-series for hotspot and cold zone)
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @param {string} source - Data source
     * @param {Object} hotspot - Hotspot sensor object
     * @param {Object} coldZone - Cold zone sensor object
     * @param {number} overallAvg - Overall average temperature
     * @param {string} locale - Locale for labels (e.g., 'es-ES', 'en')
     * @returns {Promise<Object>} Trends chart data
     */
    async generateTrendsChartData(startDate, endDate, source, warmestSensor, coldestSensor, overallAvg, locale = 'es-ES') {
        try {
            // Calculate appropriate step size based on time range
            const startTime = new Date(startDate).getTime();
            const endTime = new Date(endDate).getTime();
            const durationHours = (endTime - startTime) / (1000 * 60 * 60);
            const rangeStartMs = Number.isFinite(startTime) ? startTime : null;
            const rangeEndMs = Number.isFinite(endTime) ? endTime : null;

            // Use smaller step for short ranges, daily/weekly for long ranges
            // This keeps data points optimal for Chart.js performance and readable axes
            let step;
            let timeUnit;
            const durationDays = durationHours / 24;

            // Determine if locale is Spanish
            const isSpanish = locale && (locale.startsWith('es') || locale === 'es-ES');

            if (durationHours <= 48) {
                step = '1h'; // Hourly for up to 2 days
                timeUnit = 'hour';
            } else if (durationDays <= 30) {
                step = '1d'; // Daily for up to 1 month
                timeUnit = 'day';
            } else {
                step = '1w'; // Weekly beyond one month
                timeUnit = 'week';
            }

            // Localized time unit labels for chart legend
            const timeUnitLabels = {
                hour: isSpanish ? 'por hora' : 'hourly',
                day: isSpanish ? 'diario' : 'daily',
                week: isSpanish ? 'semanal' : 'weekly'
            };
            const timeUnitLabel = timeUnitLabels[timeUnit];

            logger.info('Generating aggregate trends chart', {
                durationHours,
                step,
                timeUnit,
                startDate,
                endDate
            });

            // Query aggregate temperature trends across ALL sensors
            // This shows overall hot, cold, and average temperature patterns over time
            const maxTempQuery = `max(iot_sensor_reading{sensor_type="temperature"})`;
            const minTempQuery = `min(iot_sensor_reading{sensor_type="temperature"})`;
            const avgTempQuery = `avg(iot_sensor_reading{sensor_type="temperature"})`;

            const [maxResult, minResult, avgResult] = await Promise.all([
                victoriaMetricsService.queryRange(maxTempQuery, {
                    start: startDate,
                    end: endDate,
                    step,
                    source
                }),
                victoriaMetricsService.queryRange(minTempQuery, {
                    start: startDate,
                    end: endDate,
                    step,
                    source
                }),
                victoriaMetricsService.queryRange(avgTempQuery, {
                    start: startDate,
                    end: endDate,
                    step,
                    source
                })
            ]);

            // Log result structure for debugging
            logger.info('Query result structure', {
                maxHasData: !!maxResult.data,
                maxHasResult: !!maxResult.data?.result,
                maxResultLength: maxResult.data?.result?.length,
                maxFirstResult: maxResult.data?.result?.[0] ? Object.keys(maxResult.data.result[0]) : []
            });

            // Process aggregate data from VictoriaMetrics range queries
            const maxResultData = maxResult.data?.result?.[0];
            const minResultData = minResult.data?.result?.[0];
            const avgResultData = avgResult.data?.result?.[0];

            // Normalize VictoriaMetrics range responses regardless of shape
            // Supported shapes:
            // - values: [[ts, value], ...]
            // - values: [value, ...] + timestamps: [ts, ...]
            const parseRangeSeries = (resultData) => {
                const timestamps = [];
                const values = [];

                if (!resultData) return { timestamps, values };

                // Common VM range format: values = [[ts, value], ...]
                if (Array.isArray(resultData.values) && Array.isArray(resultData.values[0])) {
                    resultData.values.forEach(point => {
                        if (!Array.isArray(point) || point.length < 2) return;
                        const [tsRaw, valueRaw] = point;
                        const ts = parseFloat(tsRaw);
                        const val = parseFloat(valueRaw);
                        if (Number.isFinite(ts) && Number.isFinite(val)) {
                            timestamps.push(ts);
                            values.push(val);
                        }
                    });
                    return { timestamps, values };
                }

                // Alternate shape: separate timestamps and values arrays
                if (Array.isArray(resultData.values) && Array.isArray(resultData.timestamps)) {
                    for (let i = 0; i < resultData.values.length; i++) {
                        const ts = parseFloat(resultData.timestamps[i]);
                        const val = parseFloat(resultData.values[i]);
                        if (Number.isFinite(ts) && Number.isFinite(val)) {
                            timestamps.push(ts);
                            values.push(val);
                        }
                    }
                    return { timestamps, values };
                }

                // Object-based points: [{ timestamp, value }]
                if (Array.isArray(resultData.values) && resultData.values.length && typeof resultData.values[0] === 'object') {
                    resultData.values.forEach(point => {
                        const ts = parseFloat(point.timestamp ?? point.ts);
                        const val = parseFloat(point.value ?? point.val);
                        if (Number.isFinite(ts) && Number.isFinite(val)) {
                            timestamps.push(ts);
                            values.push(val);
                        }
                    });
                    return { timestamps, values };
                }

                return { timestamps, values };
            };

            const maxSeries = parseRangeSeries(maxResultData);
            const minSeries = parseRangeSeries(minResultData);
            const avgSeries = parseRangeSeries(avgResultData);

            // Use the longest available timestamp series as reference
            const availableSeries = [maxSeries, minSeries, avgSeries].filter(s => s.timestamps.length > 0);
            const referenceSeries = availableSeries.sort((a, b) => b.timestamps.length - a.timestamps.length)[0];

            logger.info('Aggregate trends data fetched', {
                maxDataPoints: maxSeries.values.length,
                minDataPoints: minSeries.values.length,
                avgDataPoints: avgSeries.values.length,
                timestampsCount: referenceSeries?.timestamps.length || 0,
                sampleMaxValue: maxSeries.values[0],
                sampleTimestamp: referenceSeries?.timestamps[0]
            });

            // If no data available, return null
            if (!referenceSeries || referenceSeries.timestamps.length === 0) {
                logger.warn('No time-series data available for trends chart');
                return null;
            }

            // Detect if timestamps are in seconds or milliseconds
            // Unix seconds for year 2020+ are around 1.6e9, milliseconds are around 1.6e12
            const sampleTs = referenceSeries.timestamps[0];
            const isMilliseconds = sampleTs > 1e11; // If > 100 billion, it's milliseconds

            logger.info('Timestamp format detection', {
                sampleTimestamp: sampleTs,
                isMilliseconds,
                interpretation: isMilliseconds
                    ? new Date(sampleTs).toISOString()
                    : new Date(sampleTs * 1000).toISOString()
            });

            // Convert timestamp to milliseconds consistently
            const toMs = (ts) => isMilliseconds ? ts : ts * 1000;

            // Filter reference timestamps to the requested range (defensive in case backend returns extra points)
            let filteredReference = referenceSeries.timestamps;
            if (rangeStartMs !== null && rangeEndMs !== null) {
                filteredReference = referenceSeries.timestamps.filter(ts => {
                    const tsMs = toMs(ts);
                    return tsMs >= rangeStartMs && tsMs <= rangeEndMs;
                });
            }

            if (filteredReference.length === 0) {
                logger.warn('No time-series points remain after filtering by requested range; falling back to full reference series');
                filteredReference = referenceSeries.timestamps;
            }

            // Align series values to the filtered reference timestamps
            const mapSeriesToReference = (series, referenceTimestamps) => {
                const lookup = new Map(series.timestamps.map((ts, idx) => [ts, series.values[idx]]));
                return referenceTimestamps.map(ts => lookup.has(ts) ? lookup.get(ts) : null);
            };

            // Convert timestamps to ISO strings for JSON serialization
            const timestamps = filteredReference.map(ts => new Date(toMs(ts)).toISOString());

            // Extract aligned temperature values
            const maxTemps = mapSeriesToReference(maxSeries, filteredReference);
            const minTemps = mapSeriesToReference(minSeries, filteredReference);
            const avgTemps = mapSeriesToReference(avgSeries, filteredReference);

            // Convert to {x, y} points for Chart.js time scale
            const toPoints = (values) => timestamps.map((ts, idx) => ({
                x: ts,
                y: values[idx] !== undefined ? values[idx] : null
            }));
            const maxPoints = toPoints(maxTemps);
            const minPoints = toPoints(minTemps);
            const avgPoints = toPoints(avgTemps);

            logger.info('Trends chart data processed', {
                timestamps: timestamps.length,
                maxTempsValid: maxTemps.filter(t => t !== null).length,
                minTempsValid: minTemps.filter(t => t !== null).length,
                avgTempsValid: avgTemps.filter(t => t !== null).length,
                rangeStart: rangeStartMs ? new Date(rangeStartMs).toISOString() : null,
                rangeEnd: rangeEndMs ? new Date(rangeEndMs).toISOString() : null
            });

            // Localized dataset labels with time unit
            const maxLabel = isSpanish
                ? `🔥 Temp. Máx. (${timeUnitLabel})`
                : `🔥 Max Temp. (${timeUnitLabel})`;
            const avgLabel = isSpanish
                ? `📊 Temp. Prom. (${timeUnitLabel})`
                : `📊 Avg Temp. (${timeUnitLabel})`;
            const minLabel = isSpanish
                ? `❄️ Temp. Mín. (${timeUnitLabel})`
                : `❄️ Min Temp. (${timeUnitLabel})`;

            return {
                type: 'line',
                labels: timestamps,
                datasets: [
                    {
                        label: maxLabel,
                        data: maxPoints,
                        borderColor: 'rgb(239, 68, 68)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderWidth: 2.5,
                        tension: 0.4,
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        spanGaps: true
                    },
                    {
                        label: avgLabel,
                        data: avgPoints,
                        borderColor: 'rgb(34, 197, 94)',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        spanGaps: true
                    },
                    {
                        label: minLabel,
                        data: minPoints,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2.5,
                        tension: 0.4,
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        spanGaps: true
                    }
                ],
                options: {
                    comfortZoneMin: 20,
                    comfortZoneMax: 26,
                    overallAvg: parseFloat(overallAvg),
                    timeUnit: timeUnit,
                    timeUnitLabel: timeUnitLabel,
                    timestamps,
                    // Pass the user-selected date range for x-axis bounds
                    rangeStart: startDate,
                    rangeEnd: endDate
                }
            };

        } catch (error) {
            logger.error('Failed to generate trends chart data', { error: error.message });
            return null;
        }
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
    formatDate(dateString, locale = 'es-ES') {
        const date = new Date(dateString);
        return date.toLocaleDateString(locale, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    /**
     * Power Consumption Analysis Report
     * Analyzes current consumption from sensors c1 and c2
     * Uses range_trim_spikes(0.009) to remove noise values
     *
     * @param {Object} params - Query parameters
     * @param {string} params.startDate - Start date (ISO format)
     * @param {string} params.endDate - End date (ISO format)
     * @param {string} params.source - Data source ('local' or 'external')
     * @returns {Promise<Object>} Power consumption analysis data
     */
    async getPowerConsumptionAnalysis(params) {
        const { startDate, endDate, source = this.defaultSource, locale = 'es-ES' } = params;

        try {
            logger.info('Generating Power Consumption Analysis report', { startDate, endDate, source });

            const timeRange = this.getTimeRange(startDate, endDate);
            const voltage = 230; // Spain voltage
            const pricePerKwh = 0.18; // Average Spain electricity price €/kWh
            const durationMs = new Date(endDate) - new Date(startDate);
            const durationHours = durationMs / (1000 * 60 * 60);

            // Get detailed power metrics with range_trim_spikes
            const detailedMetrics = await this.getDetailedPowerMetrics(startDate, endDate, source, timeRange, voltage, durationHours);

            // Get consumption details (A, kWh, EUR)
            const consumptionDetails = await this.getTotalConsumptionDetails(startDate, endDate, source, timeRange, voltage, durationHours, pricePerKwh);

            // Get peak load events
            const peakLoads = await this.getPeakLoadEvents(startDate, endDate, source, timeRange, voltage, locale);

            // Get average consumption per channel for chart
            const channelData = await this.getAverageConsumptionPerChannel(startDate, endDate, source, timeRange, locale);

            const report = {
                reportName: 'Power Consumption Analysis',
                reportType: 'power-consumption',
                dateRange: `${this.formatDate(startDate, locale)} - ${this.formatDate(endDate, locale)}`,
                generatedAt: new Date().toISOString(),

                // Detailed metrics (max, avg, min with units)
                ...detailedMetrics,

                // Consumption details
                ...consumptionDetails,

                // Peak load events
                ...peakLoads,

                // Chart data
                chartData: channelData
            };

            logger.info('Power Consumption Analysis report generated successfully');
            return report;

        } catch (error) {
            logger.error('Failed to generate Power Consumption Analysis report', {
                error: error.message,
                params
            });
            throw error;
        }
    }

    /**
     * Get detailed power metrics (max, avg, min with dynamic units)
     */
    async getDetailedPowerMetrics(startDate, endDate, source, timeRange, voltage, durationHours) {
        const channels = ['current_clamp_1', 'current_clamp_2', 'current_clamp_3', 'current_clamp_4'];

        const maxQuery = `max(max_over_time(range_trim_spikes(0.009, iot_sensor_reading{sensor_type=~"${channels.join('|')}"})[${timeRange}]))`;
        const avgQuery = `avg(avg_over_time(range_trim_spikes(0.009, iot_sensor_reading{sensor_type=~"${channels.join('|')}"})[${timeRange}]))`;
        const minQuery = `min(min_over_time(range_trim_spikes(0.009, iot_sensor_reading{sensor_type=~"${channels.join('|')}"})[${timeRange}]))`;

        const [maxResult, avgResult, minResult] = await Promise.all([
            victoriaMetricsService.query(maxQuery, { time: endDate, source }),
            victoriaMetricsService.query(avgQuery, { time: endDate, source }),
            victoriaMetricsService.query(minQuery, { time: endDate, source })
        ]);

        const maxCurrent = parseFloat(maxResult.data?.result?.[0]?.values?.[0] || 0);
        const avgCurrent = parseFloat(avgResult.data?.result?.[0]?.values?.[0] || 0);
        const minCurrent = parseFloat(minResult.data?.result?.[0]?.values?.[0] || 0);

        // Convert to kWh
        const maxKwh = (maxCurrent * voltage * durationHours) / 1000;
        const avgKwh = (avgCurrent * voltage * durationHours) / 1000;
        const minKwh = (minCurrent * voltage * durationHours) / 1000;

        // Format with appropriate unit (kWh or MWh)
        const formatWithUnit = (kwh) => {
            if (kwh >= 1000) {
                return { value: (kwh / 1000).toFixed(2), unit: 'MWh' };
            }
            return { value: kwh.toFixed(2), unit: 'kWh' };
        };

        const max = formatWithUnit(maxKwh);
        const avg = formatWithUnit(avgKwh);
        const min = formatWithUnit(minKwh);

        return {
            max_consumption: max.value,
            max_consumption_unit: max.unit,
            avg_consumption: avg.value,
            avg_consumption_unit: avg.unit,
            min_consumption: min.value,
            min_consumption_unit: min.unit,
            overall_max_consumption: max.value,
            overall_avg_consumption: avg.value,
            overall_min_consumption: min.value
        };
    }

    /**
     * Get total consumption details (A, kWh, EUR)
     */
    async getTotalConsumptionDetails(startDate, endDate, source, timeRange, voltage, durationHours, pricePerKwh) {
        const channels = ['current_clamp_1', 'current_clamp_2', 'current_clamp_3', 'current_clamp_4'];

        const totalQuery = `sum(avg_over_time(range_trim_spikes(0.009, iot_sensor_reading{sensor_type=~"${channels.join('|')}"})[${timeRange}]))`;
        const totalResult = await victoriaMetricsService.query(totalQuery, { time: endDate, source });

        const totalAmperes = parseFloat(totalResult.data?.result?.[0]?.values?.[0] || 0);
        const totalKwh = (totalAmperes * voltage * durationHours) / 1000;
        const totalCost = (totalKwh * pricePerKwh).toFixed(2);

        return {
            total_amperes: totalAmperes.toFixed(2),
            total_kwh: totalKwh.toFixed(2),
            total_cost: totalCost
        };
    }

    /**
     * Get peak load events
     */
    async getPeakLoadEvents(startDate, endDate, source, timeRange, voltage, locale = 'es-ES') {
        const channels = ['current_clamp_1', 'current_clamp_2', 'current_clamp_3', 'current_clamp_4'];

        const peakPromises = channels.map(async (channel) => {
            const query = `max_over_time(range_trim_spikes(0.009, iot_sensor_reading{sensor_type="${channel}"})[${timeRange}])`;
            const result = await victoriaMetricsService.query(query, { time: endDate, source });

            const peaks = [];
            result.data?.result?.forEach(r => {
                const value = parseFloat(r.values?.[0] || 0);
                const sensorName = r.metric?.sensor_name || 'unknown';
                const power = ((value * voltage) / 1000).toFixed(2);

                    peaks.push({
                        sensor: sensorName,
                        channel: channel,
                        value: value.toFixed(2),
                        power: power,
                        time: new Date(endDate).toLocaleString(locale, {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                        })
                });
            });

            return peaks;
        });

        const allPeaks = (await Promise.all(peakPromises)).flat();
        allPeaks.sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
        const top3 = allPeaks.slice(0, 3);

        return {
            peak_1_sensor: top3[0]?.sensor || 'N/A',
            peak_1_channel: top3[0]?.channel || 'N/A',
            peak_1_value: top3[0]?.value || '0.00',
            peak_1_power: top3[0]?.power || '0.00',
            peak_1_time: top3[0]?.time || 'N/A',
            peak_2_sensor: top3[1]?.sensor || 'N/A',
            peak_2_channel: top3[1]?.channel || 'N/A',
            peak_2_value: top3[1]?.value || '0.00',
            peak_2_power: top3[1]?.power || '0.00',
            peak_2_time: top3[1]?.time || 'N/A',
            peak_3_sensor: top3[2]?.sensor || 'N/A',
            peak_3_channel: top3[2]?.channel || 'N/A',
            peak_3_value: top3[2]?.value || '0.00',
            peak_3_power: top3[2]?.power || '0.00',
            peak_3_time: top3[2]?.time || 'N/A'
        };
    }

    /**
     * Sound Levels - Noise Pollution Analysis Report
     * Analyzes sound levels across sensors to identify noisiest locations
     * Uses range_trim_spikes(0.009) to remove noise values
     *
     * @param {Object} params - Query parameters
     * @param {string} params.startDate - Start date (ISO format)
     * @param {string} params.endDate - End date (ISO format)
     * @param {string} params.source - Data source ('local' or 'external')
     * @returns {Promise<Object>} Sound level analysis data
     */
    async getSoundLevelAnalysis(params) {
        const { startDate, endDate, source = this.defaultSource, locale = 'es-ES' } = params;

        try {
            logger.info('Generating Sound Level Analysis report', { startDate, endDate, source });

            const timeRange = this.getTimeRange(startDate, endDate);

            // Get max, avg, min sound levels
            const soundMetrics = await this.getDetailedSoundMetrics(startDate, endDate, source, timeRange);

            // Get noisiest locations for chart
            const noisiestLocations = await this.getNoisiestLocations(startDate, endDate, source, timeRange);

            // Get peak noise events
            const peakNoiseEvents = await this.getPeakNoiseEvents(startDate, endDate, source, timeRange, locale);

            // Calculate statistics
            const statistics = await this.getSoundStatistics(startDate, endDate, source, timeRange);

            const report = {
                reportName: 'Sound Levels - Noise Pollution Analysis',
                reportType: 'sound-analysis',
                dateRange: `${this.formatDate(startDate, locale)} - ${this.formatDate(endDate, locale)}`,
                generatedAt: new Date().toISOString(),

                // Sound metrics
                ...soundMetrics,

                // Statistics
                ...statistics,

                // Peak noise events
                ...peakNoiseEvents,

                // Chart data
                chartData: noisiestLocations
            };

            logger.info('Sound Level Analysis report generated successfully');
            return report;

        } catch (error) {
            logger.error('Failed to generate Sound Level Analysis report', {
                error: error.message,
                params
            });
            throw error;
        }
    }

    /**
     * Get detailed sound metrics (max, avg, min)
     */
    async getDetailedSoundMetrics(startDate, endDate, source, timeRange) {
        const maxQuery = `max(clamp_max(max_over_time(iot_sensor_reading{sensor_type="soundPeak"}[${timeRange}]), 95))`;
        const avgQuery = `avg_over_time(iot_sensor_reading{sensor_type="soundAvg"}[${timeRange}])`;
        const minQuery = `min(min_over_time(iot_sensor_reading{sensor_type="soundAvg"}[${timeRange}]))`;

        const [maxResult, avgResult, minResult] = await Promise.all([
            victoriaMetricsService.query(maxQuery, { time: endDate, source }),
            victoriaMetricsService.query(avgQuery, { time: endDate, source }),
            victoriaMetricsService.query(minQuery, { time: endDate, source })
        ]);

        const maxValues = maxResult.data?.result?.map(r => parseFloat(r.values?.[0] || 0)) || [];
        const avgValues = avgResult.data?.result?.map(r => parseFloat(r.values?.[0] || 0)) || [];
        const minValues = minResult.data?.result?.map(r => parseFloat(r.values?.[0] || 0)) || [];

        const maxSound = maxValues.length > 0 ? Math.max(...maxValues) : 0;
        const avgSound = avgValues.length > 0 ? avgValues.reduce((a, b) => a + b, 0) / avgValues.length : 0;
        const minSound = minValues.length > 0 ? Math.min(...minValues) : 0;

        return {
            overall_max_sound: maxSound.toFixed(1),
            overall_avg_sound: avgSound.toFixed(1),
            overall_min_sound: minSound.toFixed(1)
        };
    }

    /**
     * Get noisiest locations for chart
     */
    async getNoisiestLocations(startDate, endDate, source, timeRange) {
        const query = `avg_over_time(iot_sensor_reading{sensor_type="soundAvg"}[${timeRange}])`;
        const result = await victoriaMetricsService.query(query, { time: endDate, source });

        const locations = [];
        result.data?.result?.forEach(r => {
            const avgSound = parseFloat(r.values?.[0] || 0);
            const sensorName = r.metric?.sensor_name || 'unknown';

            locations.push({
                sensor: sensorName,
                avgSound: avgSound.toFixed(1)
            });
        });

        // Sort by sound level descending
        locations.sort((a, b) => parseFloat(b.avgSound) - parseFloat(a.avgSound));

        // Get top 5 noisiest and bottom 3 quietest
        const noisiest = locations.slice(0, Math.min(5, locations.length));
        const quietest = locations.slice(-Math.min(3, locations.length)).reverse();

        return {
            labels: [...noisiest.map(l => l.sensor), ...quietest.map(l => l.sensor)],
            datasets: [
                {
                    label: 'Noisiest Locations',
                    data: noisiest.map(l => parseFloat(l.avgSound)),
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1
                },
                {
                    label: 'Quietest Locations',
                    data: Array(noisiest.length).fill(null).concat(quietest.map(l => parseFloat(l.avgSound))),
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 1
                }
            ]
        };
    }

    /**
     * Get peak noise events
     */
    async getPeakNoiseEvents(startDate, endDate, source, timeRange, locale = 'es-ES') {
        const query = `max_over_time(iot_sensor_reading{sensor_type="soundPeak"}[${timeRange}])`;
        const result = await victoriaMetricsService.query(query, { time: endDate, source });

        const peaks = [];
        result.data?.result?.forEach(r => {
            const value = parseFloat(r.values?.[0] || 0);
            const sensorName = r.metric?.sensor_name || 'unknown';

            peaks.push({
                sensor: sensorName,
                location: `Zone ${sensorName}`,
                value: value.toFixed(1),
                time: new Date(endDate).toLocaleString(locale, {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                duration: '~2 min' // Placeholder - would need time-series data for accurate duration
            });
        });

        // Sort by value descending and take top 2
        peaks.sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
        const top2 = peaks.slice(0, 2);

        return {
            peak_noise_1_location: top2[0]?.location || 'N/A',
            peak_noise_1_sensor: top2[0]?.sensor || 'N/A',
            peak_noise_1_value: top2[0]?.value || '0.0',
            peak_noise_1_time: top2[0]?.time || 'N/A',
            peak_noise_1_duration: top2[0]?.duration || 'N/A',
            peak_noise_2_location: top2[1]?.location || 'N/A',
            peak_noise_2_sensor: top2[1]?.sensor || 'N/A',
            peak_noise_2_value: top2[1]?.value || '0.0',
            peak_noise_2_time: top2[1]?.time || 'N/A',
            peak_noise_2_duration: top2[1]?.duration || 'N/A'
        };
    }

    /**
     * Get sound statistics
     */
    async getSoundStatistics(startDate, endDate, source, timeRange) {
        // Count total sound sensors
        const sensorsQuery = `count(count_over_time(iot_sensor_reading{sensor_type="soundAvg"}[${timeRange}]))`;
        const sensorsResult = await victoriaMetricsService.query(sensorsQuery, { time: endDate, source });
        const totalSensorsValues = sensorsResult.data?.result?.map(r => parseInt(r.values?.[0] || 0)) || [];
        const totalSensors = totalSensorsValues.length > 0 ? Math.max(...totalSensorsValues) : 0;

        // Calculate percentage of time above 70 dB threshold
        const thresholdQuery = `avg(iot_sensor_reading{sensor_type="soundAvg"} > 70)`;
        const thresholdResult = await victoriaMetricsService.query(thresholdQuery, { time: endDate, source });
        const thresholdValues = thresholdResult.data?.result?.map(r => parseFloat(r.values?.[0] || 0)) || [];
        const aboveThreshold = thresholdValues.length > 0 ? thresholdValues.reduce((a, b) => a + b, 0) / thresholdValues.length : 0;
        const aboveThresholdPercent = (aboveThreshold * 100).toFixed(1);

        return {
            total_sound_sensors: totalSensors,
            above_threshold_percent: aboveThresholdPercent
        };
    }

    /**
     * Get average consumption per channel for chart visualization
     */
    async getAverageConsumptionPerChannel(startDate, endDate, source, timeRange, locale = 'es-ES') {
        const channels = ['current_clamp_1', 'current_clamp_2', 'current_clamp_3', 'current_clamp_4'];
        const sensors = ['c1', 'c2'];

        const channelDataPromises = sensors.map(async (sensor) => {
            const channelValues = await Promise.all(
                channels.map(async (channel) => {
                    const query = `avg_over_time(range_trim_spikes(0.009, iot_sensor_reading{sensor_type="${channel}", sensor_name="${sensor}"})[${timeRange}])`;
                    const result = await victoriaMetricsService.query(query, { time: endDate, source });
                    return parseFloat(result.data?.result?.[0]?.values?.[0] || 0);
                })
            );

            return {
                sensor: sensor,
                channel1: channelValues[0].toFixed(2),
                channel2: channelValues[1].toFixed(2),
                channel3: channelValues[2].toFixed(2),
                channel4: channelValues[3].toFixed(2),
                average: (channelValues.reduce((a, b) => a + b, 0) / channelValues.length).toFixed(2)
            };
        });

        const sensorData = await Promise.all(channelDataPromises);

        // Generate labels based on locale
        const phaseLabels = locale.startsWith('es')
            ? ['Fase R', 'Fase S', 'Fase T', 'Neutro']
            : ['Phase R', 'Phase S', 'Phase T', 'Neutral'];

        return {
            labels: phaseLabels,
            datasets: [
                {
                    label: 'Sensor C1',
                    data: [sensorData[0].channel1, sensorData[0].channel2, sensorData[0].channel3, sensorData[0].channel4],
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1
                },
                {
                    label: 'Sensor C2',
                    data: [sensorData[1].channel1, sensorData[1].channel2, sensorData[1].channel3, sensorData[1].channel4],
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 1
                }
            ]
        };
    }
}

export default new UserMetricsService();
