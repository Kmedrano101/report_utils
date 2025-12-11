/**
 * Report Metrics Service
 * Calculates aggregated metrics for PDF reports from VictoriaMetrics data
 */

import logger from '../utils/logger.js';
import victoriaMetricsService from './victoriaMetricsService.js';

class ReportMetricsService {
    constructor() {
        // Default to external VictoriaMetrics
        this.defaultSource = 'external';
    }

    /**
     * Get all report metrics for a given date range
     * @param {Object} params - Query parameters
     * @param {string} params.startDate - Start date (ISO format)
     * @param {string} params.endDate - End date (ISO format)
     * @param {string} params.source - Data source ('local' or 'external')
     * @param {string} params.reportType - Report type ('hotspots', 'power', 'sound')
     * @returns {Promise<Object>} All calculated metrics
     */
    async getReportMetrics(params) {
        const { startDate, endDate, source = this.defaultSource, reportType = 'all' } = params;

        try {
            logger.info('Calculating report metrics', { startDate, endDate, source, reportType });

            // Calculate all metrics in parallel
            const promises = [
                this.getTemperatureMetrics(startDate, endDate, source),
                this.getHumidityMetrics(startDate, endDate, source),
                this.getSoundMetrics(startDate, endDate, source),
                this.getPowerMetrics(startDate, endDate, source),
                this.getSensorCounts(source, reportType)
            ];

            // Add report-specific traffic light indicators
            if (reportType === 'hotspots' || reportType === 'temperature') {
                promises.push(this.getTemperatureComfortMetrics(startDate, endDate, source));
            }
            if (reportType === 'sound' || reportType === 'noise') {
                promises.push(this.getAcousticComfortMetrics(startDate, endDate, source));
            }
            if (reportType === 'power') {
                promises.push(this.getPhaseBalanceMetrics(startDate, endDate, source));
            }

            const results = await Promise.all(promises);

            const [
                temperature,
                humidity,
                sound,
                power,
                sensorCounts,
                trafficLightIndicator
            ] = results;

            const metrics = {
                // Temperature metrics
                avg_temperature: temperature.avg,
                temp_min: temperature.min,
                temp_max: temperature.max,

                // Humidity metrics
                avg_humidity: humidity.avg,
                humidity_min: humidity.min,
                humidity_max: humidity.max,

                // Sound metrics
                peak_sound: sound.peak,
                avg_sound: sound.avg,

                // Power metrics
                total_power: power.total,
                peak_power: power.peak,

                // Sensor counts
                total_sensors: sensorCounts.total,
                active_sensors: sensorCounts.active,
                active_count: sensorCounts.active,
                offline_count: sensorCounts.offline,

                // Traffic light indicators (if available)
                ...(trafficLightIndicator || {}),

                // Metadata
                date_range: `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`,
                generation_date: new Date().toISOString(),
                source
            };

            logger.info('Report metrics calculated successfully', { metrics });
            return metrics;

        } catch (error) {
            logger.error('Failed to calculate report metrics', { error: error.message, params });
            throw error;
        }
    }

    /**
     * Calculate average temperature metrics
     * Uses only temperature sensors t1-t30 (excludes sound sensors s1-s7)
     */
    async getTemperatureMetrics(startDate, endDate, source) {
        try {
            // Query: Temperature readings from t1-t30 sensors only
            // Filter: sensor_name matches t1-t30 pattern
            const sensorFilter = 'sensor_type="temperature", sensor_name=~"t[1-9]|t[12][0-9]|t30"';
            const avgQuery = `avg_over_time(iot_sensor_reading{${sensorFilter}}[${this.getTimeRange(startDate, endDate)}])`;
            const minQuery = `min_over_time(iot_sensor_reading{${sensorFilter}}[${this.getTimeRange(startDate, endDate)}])`;
            const maxQuery = `max_over_time(iot_sensor_reading{${sensorFilter}}[${this.getTimeRange(startDate, endDate)}])`;

            const [avgResult, minResult, maxResult] = await Promise.all([
                victoriaMetricsService.query(avgQuery, { time: endDate, source }),
                victoriaMetricsService.query(minQuery, { time: endDate, source }),
                victoriaMetricsService.query(maxQuery, { time: endDate, source })
            ]);

            // Calculate overall average from all sensors
            // VictoriaMetrics external API returns: result[].values[0] (not result[].value[1])
            const avgValues = avgResult.data?.result?.map(r => parseFloat(r.values?.[0] || 0)) || [];
            const minValues = minResult.data?.result?.map(r => parseFloat(r.values?.[0] || 0)) || [];
            const maxValues = maxResult.data?.result?.map(r => parseFloat(r.values?.[0] || 0)) || [];

            const avg = avgValues.length > 0
                ? (avgValues.reduce((a, b) => a + b, 0) / avgValues.length).toFixed(1)
                : '0.0';

            const min = minValues.length > 0 ? Math.min(...minValues).toFixed(1) : '0.0';
            const max = maxValues.length > 0 ? Math.max(...maxValues).toFixed(1) : '0.0';

            return { avg, min, max };

        } catch (error) {
            logger.error('Failed to calculate temperature metrics', { error: error.message });
            return { avg: '0.0', min: '0.0', max: '0.0' };
        }
    }

    /**
     * Calculate average humidity metrics
     * Uses all temperature sensors and sound sensors (both have humidity)
     */
    async getHumidityMetrics(startDate, endDate, source) {
        try {
            // Query: Average humidity across all sensors
            const avgQuery = `avg_over_time(iot_sensor_reading{sensor_type="humidity"}[${this.getTimeRange(startDate, endDate)}])`;
            const minQuery = `min_over_time(iot_sensor_reading{sensor_type="humidity"}[${this.getTimeRange(startDate, endDate)}])`;
            const maxQuery = `max_over_time(iot_sensor_reading{sensor_type="humidity"}[${this.getTimeRange(startDate, endDate)}])`;

            const [avgResult, minResult, maxResult] = await Promise.all([
                victoriaMetricsService.query(avgQuery, { time: endDate, source }),
                victoriaMetricsService.query(minQuery, { time: endDate, source }),
                victoriaMetricsService.query(maxQuery, { time: endDate, source })
            ]);

            const avgValues = avgResult.data?.result?.map(r => parseFloat(r.values?.[0] || 0)) || [];
            const minValues = minResult.data?.result?.map(r => parseFloat(r.values?.[0] || 0)) || [];
            const maxValues = maxResult.data?.result?.map(r => parseFloat(r.values?.[0] || 0)) || [];

            const avg = avgValues.length > 0
                ? Math.round(avgValues.reduce((a, b) => a + b, 0) / avgValues.length)
                : 0;

            const min = minValues.length > 0 ? Math.round(Math.min(...minValues)) : 0;
            const max = maxValues.length > 0 ? Math.round(Math.max(...maxValues)) : 0;

            return { avg, min, max };

        } catch (error) {
            logger.error('Failed to calculate humidity metrics', { error: error.message });
            return { avg: 0, min: 0, max: 0 };
        }
    }

    /**
     * Calculate sound level metrics
     * Uses sound sensors (s1, s2, s3, s6, s7) - soundPeak and soundAvg
     * Uses clamp_max(95) to cap unrealistic ceiling values from sensors
     */
    async getSoundMetrics(startDate, endDate, source) {
        try {
            // Query: Peak sound level (max of soundPeak)
            // Use clamp_max to cap at 95 dB (indoor environments rarely exceed this)
            const peakQuery = `max(clamp_max(max_over_time(iot_sensor_reading{sensor_type="soundPeak"}[${this.getTimeRange(startDate, endDate)}]), 95))`;

            // Query: Average sound level (avg of soundAvg)
            const avgQuery = `avg_over_time(iot_sensor_reading{sensor_type="soundAvg"}[${this.getTimeRange(startDate, endDate)}])`;

            const [peakResult, avgResult] = await Promise.all([
                victoriaMetricsService.query(peakQuery, { time: endDate, source }),
                victoriaMetricsService.query(avgQuery, { time: endDate, source })
            ]);

            const peakValues = peakResult.data?.result?.map(r => parseFloat(r.values?.[0] || 0)) || [];
            const avgValues = avgResult.data?.result?.map(r => parseFloat(r.values?.[0] || 0)) || [];

            const peak = peakValues.length > 0 ? Math.round(Math.max(...peakValues)) : 0;
            const avg = avgValues.length > 0
                ? Math.round(avgValues.reduce((a, b) => a + b, 0) / avgValues.length)
                : 0;

            return { peak, avg };

        } catch (error) {
            logger.error('Failed to calculate sound metrics', { error: error.message });
            return { peak: 0, avg: 0 };
        }
    }

    /**
     * Calculate power consumption metrics
     * Uses current clamp sensors (c1, c2) - 4 channels each
     * Converts from Amperes to kWh (assuming 230V AC)
     * Uses range_trim_spikes(0.009) to remove noise values
     */
    async getPowerMetrics(startDate, endDate, source) {
        try {
            // Query all current clamp channels
            const channels = ['current_clamp_1', 'current_clamp_2', 'current_clamp_3', 'current_clamp_4'];

            // Calculate total power consumption across all channels
            // Sum of all current readings over time, converted to kWh
            // Use range_trim_spikes to remove noise values (spikes < 0.009)
            const totalQuery = `sum(avg_over_time(range_trim_spikes(0.009, iot_sensor_reading{sensor_type=~"${channels.join('|')}"})[${this.getTimeRange(startDate, endDate)}]))`;

            // Peak current reading
            // Use range_trim_spikes to remove noise values before finding peak
            const peakQuery = `max(max_over_time(range_trim_spikes(0.009, iot_sensor_reading{sensor_type=~"${channels.join('|')}"})[${this.getTimeRange(startDate, endDate)}]))`;

            const [totalResult, peakResult] = await Promise.all([
                victoriaMetricsService.query(totalQuery, { time: endDate, source }),
                victoriaMetricsService.query(peakQuery, { time: endDate, source })
            ]);

            const totalCurrent = parseFloat(totalResult.data?.result?.[0]?.values?.[0] || 0);
            const peakCurrent = parseFloat(peakResult.data?.result?.[0]?.values?.[0] || 0);

            // Calculate duration in hours
            const durationMs = new Date(endDate) - new Date(startDate);
            const durationHours = durationMs / (1000 * 60 * 60);

            // Convert to kWh: (Amperes * Voltage * Hours) / 1000
            // Assuming 230V AC for Europe
            const voltage = 230;
            const total = ((totalCurrent * voltage * durationHours) / 1000).toFixed(2);
            const peak = peakCurrent.toFixed(2);

            return { total, peak };

        } catch (error) {
            logger.error('Failed to calculate power metrics', { error: error.message });
            return { total: '0.00', peak: '0.00' };
        }
    }

    /**
     * Get sensor counts (total, active, offline) filtered by report type
     * @param {string} source - Data source ('local' or 'external')
     * @param {string} reportType - Report type ('hotspots', 'power', 'sound')
     * Temperature sensors: tx, t1, t2, ... t30 (31 sensors)
     * Sound sensors: s1-s7 (7 sensors)
     * Power sensors: c1-c2 (2 sensors)
     */
    async getSensorCounts(source, reportType = 'all') {
        try {
            let sensorFilter = '';
            let expectedTotal = 0;

            // Filter sensors based on report type
            switch (reportType) {
                case 'hotspots':
                case 'temperature':
                    // Temperature sensors: tx, t1-t30
                    sensorFilter = 'sensor_name=~"tx|t[1-9]|t[12][0-9]|t30"';
                    expectedTotal = 31; // tx + t1-t30
                    break;

                case 'sound':
                case 'noise':
                    // Sound sensors: s1-s7
                    sensorFilter = 'sensor_name=~"s[1-7]"';
                    expectedTotal = 7;
                    break;

                case 'power':
                    // Power sensors: c1-c2
                    sensorFilter = 'sensor_name=~"c[12]"';
                    expectedTotal = 2;
                    break;

                default:
                    // All sensors: tx, t1-t30, s1-s7, c1-c2
                    sensorFilter = 'sensor_name=~"tx|t[1-9]|t[12][0-9]|t30|s[1-7]|c[12]"';
                    expectedTotal = 40; // tx + t1-t30 (31) + s1-s7 (7) + c1-c2 (2)
                    break;
            }

            // Query to get sensors with recent data (last 1 hour = active)
            const activeSensorsQuery = `count(count by (sensor_name) (iot_sensor_reading{${sensorFilter}}[1h]))`;

            const activeResult = await victoriaMetricsService.query(activeSensorsQuery, { source });

            const active = parseInt(activeResult.data?.result?.[0]?.values?.[0] || 0);
            const total = expectedTotal;
            const offline = total - active;

            return { total, active, offline };

        } catch (error) {
            logger.error('Failed to get sensor counts', { error: error.message, reportType });
            return { total: 0, active: 0, offline: 0 };
        }
    }

    /**
     * Calculate time range for VictoriaMetrics queries
     */
    getTimeRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const durationMs = end - start;

        // Convert to VictoriaMetrics duration format
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

    /**
     * Calculate temperature comfort metrics
     * Comfort zone: 20-26°C
     * @returns {Object} Temperature comfort indicators
     */
    async getTemperatureComfortMetrics(startDate, endDate, source) {
        try {
            // Updated regex to include all sensors t1-t30
            const sensorFilter = 'sensor_type="temperature", sensor_name=~"t[1-9]|t[12][0-9]|t30"';

            // VictoriaMetrics doesn't support value comparisons in queries
            // We need to fetch all temperature readings and filter them in JavaScript
            const query = `iot_sensor_reading{${sensorFilter}}`;

            // Use query_range to get all temperature readings over the time period
            const result = await victoriaMetricsService.queryRange(query, {
                start: startDate,
                end: endDate,
                step: '5m',  // 5-minute intervals
                source
            });

            logger.info('Query range result structure', {
                hasData: !!result.data,
                hasResult: !!result.data?.result,
                resultCount: result.data?.result?.length || 0,
                resultType: typeof result.data?.result
            });

            // Count readings in each temperature range
            let comfortReadings = 0;
            let coldReadings = 0;
            let hotReadings = 0;

            // Process all sensor time series
            if (result.data?.result) {
                for (const series of result.data.result) {
                    if (series.values && Array.isArray(series.values)) {
                        // Values are returned as arrays of [timestamp, value]
                        for (const value of series.values) {
                            // VictoriaMetrics returns [timestamp, "value"]
                            // We need to parse the second element (the value)
                            const temp = Array.isArray(value) ? parseFloat(value[1]) : parseFloat(value);
                            if (!isNaN(temp)) {
                                if (temp < 20) {
                                    coldReadings++;
                                } else if (temp >= 20 && temp <= 26) {
                                    comfortReadings++;
                                } else if (temp > 26) {
                                    hotReadings++;
                                }
                            }
                        }
                    }
                }
            }

            logger.info('Temperature comfort readings counted', {
                comfortReadings,
                coldReadings,
                hotReadings,
                totalReadings: comfortReadings + coldReadings + hotReadings
            });

            const totalReadings = comfortReadings + coldReadings + hotReadings;

            // Calculate percentages
            const comfortPercentage = totalReadings > 0 ? Math.round((comfortReadings / totalReadings) * 100) : 0;
            const coldPercentage = totalReadings > 0 ? Math.round((coldReadings / totalReadings) * 100) : 0;
            const hotPercentage = totalReadings > 0 ? Math.round((hotReadings / totalReadings) * 100) : 0;

            // Calculate critical percentage (cold + hot = out of comfort zone)
            const criticalPercentage = coldPercentage + hotPercentage;

            // Determine traffic light status
            let statusColor, statusText;
            if (comfortPercentage >= 80) {
                statusColor = '#10B981'; // Green
                statusText = 'Excellent';
            } else if (comfortPercentage >= 50) {
                statusColor = '#F59E0B'; // Yellow
                statusText = 'Warning';
            } else {
                statusColor = '#EF4444'; // Red
                statusText = 'Critical';
            }

            // Calculate segmented bar widths and positions
            // Portrait: max 420px (adjusted for two-column layout), Landscape: max 460px
            const portraitMaxWidth = 420;
            const landscapeMaxWidth = 460;

            // Calculate widths for each segment
            const coldBarWidthPortrait = Math.round((coldPercentage / 100) * portraitMaxWidth);
            const comfortBarWidthPortrait = Math.round((comfortPercentage / 100) * portraitMaxWidth);
            const hotBarWidthPortrait = Math.round((hotPercentage / 100) * portraitMaxWidth);

            const coldBarWidthLandscape = Math.round((coldPercentage / 100) * landscapeMaxWidth);
            const comfortBarWidthLandscape = Math.round((comfortPercentage / 100) * landscapeMaxWidth);
            const hotBarWidthLandscape = Math.round((hotPercentage / 100) * landscapeMaxWidth);

            // Calculate start positions for each segment (x coordinate)
            // Portrait starts at x=50
            const comfortBarStartPortrait = 50 + coldBarWidthPortrait;
            const hotBarStartPortrait = comfortBarStartPortrait + comfortBarWidthPortrait;

            // Landscape starts at x=50
            const comfortBarStartLandscape = 50 + coldBarWidthLandscape;
            const hotBarStartLandscape = comfortBarStartLandscape + comfortBarWidthLandscape;

            // Calculate label positions (center of each segment)
            const coldLabelXPortrait = 50 + (coldBarWidthPortrait / 2);
            const comfortLabelXPortrait = comfortBarStartPortrait + (comfortBarWidthPortrait / 2);
            const hotLabelXPortrait = hotBarStartPortrait + (hotBarWidthPortrait / 2);

            const coldLabelXLandscape = 50 + (coldBarWidthLandscape / 2);
            const comfortLabelXLandscape = comfortBarStartLandscape + (comfortBarWidthLandscape / 2);
            const hotLabelXLandscape = hotBarStartLandscape + (hotBarWidthLandscape / 2);

            // Calculate circular progress indicator offset
            // Circle circumference: 2 * π * r = 2 * π * 40 = 251.2
            // stroke-dashoffset = circumference - (circumference * percentage / 100)
            const circleCircumference = 251.2;
            const comfortCircleOffset = circleCircumference - (circleCircumference * comfortPercentage / 100);

            // Calculate donut chart arc lengths and offsets
            // Donut chart circumference: 2 * π * 31.5 ≈ 198
            const donutCircumference = 198;
            const coldArcLength = (coldPercentage / 100) * donutCircumference;
            const comfortArcLength = (comfortPercentage / 100) * donutCircumference;
            const hotArcLength = (hotPercentage / 100) * donutCircumference;

            // Arc offsets (negative because we want clockwise drawing)
            // Cold starts at 0, Comfort starts after cold, Hot starts after comfort
            const comfortArcOffset = -coldArcLength;
            const hotArcOffset = -(coldArcLength + comfortArcLength);

            return {
                comfort_percentage: comfortPercentage,
                cold_percentage: coldPercentage,
                hot_percentage: hotPercentage,
                critical_percentage: criticalPercentage,
                comfort_circle_offset: comfortCircleOffset.toFixed(2),

                // Donut chart arc lengths and offsets
                cold_arc_length: coldArcLength.toFixed(1),
                comfort_arc_length: comfortArcLength.toFixed(1),
                hot_arc_length: hotArcLength.toFixed(1),
                comfort_arc_offset: comfortArcOffset.toFixed(1),
                hot_arc_offset: hotArcOffset.toFixed(1),

                // Portrait dimensions
                cold_bar_width_portrait: coldBarWidthPortrait,
                comfort_bar_width_portrait: comfortBarWidthPortrait,
                hot_bar_width_portrait: hotBarWidthPortrait,
                comfort_bar_start_portrait: comfortBarStartPortrait,
                hot_bar_start_portrait: hotBarStartPortrait,
                cold_label_x_portrait: Math.round(coldLabelXPortrait),
                comfort_label_x_portrait: Math.round(comfortLabelXPortrait),
                hot_label_x_portrait: Math.round(hotLabelXPortrait),

                // Landscape dimensions
                cold_bar_width_landscape: coldBarWidthLandscape,
                comfort_bar_width_landscape: comfortBarWidthLandscape,
                hot_bar_width_landscape: hotBarWidthLandscape,
                comfort_bar_start_landscape: comfortBarStartLandscape,
                hot_bar_start_landscape: hotBarStartLandscape,
                cold_label_x_landscape: Math.round(coldLabelXLandscape),
                comfort_label_x_landscape: Math.round(comfortLabelXLandscape),
                hot_label_x_landscape: Math.round(hotLabelXLandscape),

                // Legacy properties for backward compatibility
                comfort_bar_width: comfortBarWidthPortrait,
                comfort_bar_width_landscape: comfortBarWidthLandscape,
                comfort_bar_color: statusColor,
                comfort_status_color: statusColor,
                comfort_status_text: statusText
            };

        } catch (error) {
            logger.error('Failed to calculate temperature comfort metrics', { error: error.message });
            return {
                comfort_percentage: 0,
                cold_percentage: 0,
                hot_percentage: 0,
                critical_percentage: 0,
                comfort_circle_offset: '251.2',

                // Donut chart arc lengths and offsets
                cold_arc_length: '0',
                comfort_arc_length: '0',
                hot_arc_length: '0',
                comfort_arc_offset: '0',
                hot_arc_offset: '0',

                // Portrait dimensions
                cold_bar_width_portrait: 0,
                comfort_bar_width_portrait: 0,
                hot_bar_width_portrait: 0,
                comfort_bar_start_portrait: 50,
                hot_bar_start_portrait: 50,
                cold_label_x_portrait: 50,
                comfort_label_x_portrait: 50,
                hot_label_x_portrait: 50,

                // Landscape dimensions
                cold_bar_width_landscape: 0,
                comfort_bar_width_landscape: 0,
                hot_bar_width_landscape: 0,
                comfort_bar_start_landscape: 50,
                hot_bar_start_landscape: 50,
                cold_label_x_landscape: 50,
                comfort_label_x_landscape: 50,
                hot_label_x_landscape: 50,

                // Legacy properties
                comfort_bar_width: 0,
                comfort_bar_width_landscape: 0,
                comfort_bar_color: '#9CA3AF',
                comfort_status_color: '#9CA3AF',
                comfort_status_text: 'No Data'
            };
        }
    }

    /**
     * Calculate acoustic comfort metrics
     * Comfort zone: 35-45 dB, Critical threshold: 60 dB
     * @returns {Object} Acoustic comfort indicators
     */
    async getAcousticComfortMetrics(startDate, endDate, source) {
        try {
            const timeRange = this.getTimeRange(startDate, endDate);

            // Query to count readings in different sound level ranges
            const comfortQuery = `count_over_time((iot_sensor_reading{sensor_type="soundAvg"} >= 35 and iot_sensor_reading{sensor_type="soundAvg"} <= 45)[${timeRange}])`;
            const moderateQuery = `count_over_time((iot_sensor_reading{sensor_type="soundAvg"} > 45 and iot_sensor_reading{sensor_type="soundAvg"} < 60)[${timeRange}])`;
            const criticalQuery = `count_over_time((iot_sensor_reading{sensor_type="soundAvg"} >= 60)[${timeRange}])`;

            const [comfortResult, moderateResult, criticalResult] = await Promise.all([
                victoriaMetricsService.query(comfortQuery, { time: endDate, source }),
                victoriaMetricsService.query(moderateQuery, { time: endDate, source }),
                victoriaMetricsService.query(criticalQuery, { time: endDate, source })
            ]);

            // Sum all readings across sensors
            // Each result entry has format: { metric: {...}, value: [timestamp, "count"] }
            const comfortReadings = comfortResult.data?.result?.reduce((sum, r) => {
                const value = parseFloat(r.value?.[1] || r.values?.[0]?.[1] || 0);
                return sum + value;
            }, 0) || 0;
            const moderateReadings = moderateResult.data?.result?.reduce((sum, r) => {
                const value = parseFloat(r.value?.[1] || r.values?.[0]?.[1] || 0);
                return sum + value;
            }, 0) || 0;
            const criticalReadings = criticalResult.data?.result?.reduce((sum, r) => {
                const value = parseFloat(r.value?.[1] || r.values?.[0]?.[1] || 0);
                return sum + value;
            }, 0) || 0;

            logger.info('Acoustic comfort readings', {
                comfortReadings,
                moderateReadings,
                criticalReadings,
                totalReadings: comfortReadings + moderateReadings + criticalReadings
            });

            const totalReadings = comfortReadings + moderateReadings + criticalReadings;

            // Calculate percentages
            const comfortPercentage = totalReadings > 0 ? Math.round((comfortReadings / totalReadings) * 100) : 0;
            const moderatePercentage = totalReadings > 0 ? Math.round((moderateReadings / totalReadings) * 100) : 0;
            const criticalPercentage = totalReadings > 0 ? Math.round((criticalReadings / totalReadings) * 100) : 0;

            // Determine traffic light status
            let statusColor, statusText;
            if (comfortPercentage >= 70) {
                statusColor = '#10B981'; // Green
                statusText = 'Comfort Zone';
            } else if (comfortPercentage >= 40) {
                statusColor = '#F59E0B'; // Yellow
                statusText = 'Moderate';
            } else {
                statusColor = '#EF4444'; // Red
                statusText = 'Critical';
            }

            // Calculate wave amplitude based on average sound level
            // Map 35-60 dB to Y-coordinate 10-50 (lower Y = higher amplitude)
            const avgSoundValue = parseFloat(this.avgSound || 45);
            const waveAmplitude = avgSoundValue <= 35 ? 10 :
                                 avgSoundValue >= 60 ? 50 :
                                 Math.round(10 + ((avgSoundValue - 35) / 25) * 40);

            return {
                acoustic_comfort_percentage: comfortPercentage,
                acoustic_moderate_percentage: moderatePercentage,
                acoustic_critical_percentage: criticalPercentage,
                acoustic_wave_color: statusColor,
                acoustic_wave_amplitude: waveAmplitude,
                acoustic_status_color: statusColor,
                acoustic_status_text: statusText
            };

        } catch (error) {
            logger.error('Failed to calculate acoustic comfort metrics', { error: error.message });
            return {
                acoustic_comfort_percentage: 0,
                acoustic_moderate_percentage: 0,
                acoustic_critical_percentage: 0,
                acoustic_wave_color: '#9CA3AF',
                acoustic_wave_amplitude: 30,
                acoustic_status_color: '#9CA3AF',
                acoustic_status_text: 'No Data'
            };
        }
    }

    /**
     * Calculate three-phase load balance metrics
     * Queries current clamp sensors c1 and c2 with 4 channels each
     * @returns {Object} Phase balance indicators
     */
    async getPhaseBalanceMetrics(startDate, endDate, source) {
        try {
            const timeRange = this.getTimeRange(startDate, endDate);

            // Query average current for each channel
            // Assuming: C1_Ch1, C1_Ch2, C1_Ch3 = F1, F2, F3 respectively
            // C2 channels provide backup/redundant measurements
            const f1Query = `avg_over_time(iot_sensor_reading{sensor_type="current_clamp_1"}[${timeRange}])`;
            const f2Query = `avg_over_time(iot_sensor_reading{sensor_type="current_clamp_2"}[${timeRange}])`;
            const f3Query = `avg_over_time(iot_sensor_reading{sensor_type="current_clamp_3"}[${timeRange}])`;

            const [f1Result, f2Result, f3Result] = await Promise.all([
                victoriaMetricsService.query(f1Query, { time: endDate, source }),
                victoriaMetricsService.query(f2Query, { time: endDate, source }),
                victoriaMetricsService.query(f3Query, { time: endDate, source })
            ]);

            // Get average current for each phase
            const f1Current = parseFloat(f1Result.data?.result?.[0]?.values?.[0] || 0);
            const f2Current = parseFloat(f2Result.data?.result?.[0]?.values?.[0] || 0);
            const f3Current = parseFloat(f3Result.data?.result?.[0]?.values?.[0] || 0);

            const totalCurrent = f1Current + f2Current + f3Current;

            // Calculate load percentages
            const f1Percentage = totalCurrent > 0 ? Math.round((f1Current / totalCurrent) * 100) : 33;
            const f2Percentage = totalCurrent > 0 ? Math.round((f2Current / totalCurrent) * 100) : 33;
            const f3Percentage = totalCurrent > 0 ? Math.round((f3Current / totalCurrent) * 100) : 34;

            // Calculate bar widths (portrait: max 180px, landscape: max 360px)
            const f1BarWidth = Math.round((f1Percentage / 100) * 180);
            const f2BarWidth = Math.round((f2Percentage / 100) * 180);
            const f3BarWidth = Math.round((f3Percentage / 100) * 180);
            const f1BarWidthLandscape = Math.round((f1Percentage / 100) * 360);
            const f2BarWidthLandscape = Math.round((f2Percentage / 100) * 360);
            const f3BarWidthLandscape = Math.round((f3Percentage / 100) * 360);

            // Calculate deviation from ideal balance (33.33%)
            const idealPercentage = 33.33;
            const f1Deviation = Math.abs(f1Percentage - idealPercentage);
            const f2Deviation = Math.abs(f2Percentage - idealPercentage);
            const f3Deviation = Math.abs(f3Percentage - idealPercentage);
            const maxDeviation = Math.round(Math.max(f1Deviation, f2Deviation, f3Deviation));

            // Determine traffic light status
            let statusColor, statusText, deviationColor;
            if (maxDeviation <= 5) {
                statusColor = '#10B981'; // Green
                deviationColor = '#10B981';
                statusText = 'Balanced';
            } else if (maxDeviation <= 15) {
                statusColor = '#F59E0B'; // Yellow
                deviationColor = '#F59E0B';
                statusText = 'Moderate Imbalance';
            } else {
                statusColor = '#EF4444'; // Red
                deviationColor = '#EF4444';
                statusText = 'Critical Imbalance';
            }

            return {
                phase_f1_percentage: f1Percentage,
                phase_f2_percentage: f2Percentage,
                phase_f3_percentage: f3Percentage,
                phase_f1_bar_width: f1BarWidth,
                phase_f2_bar_width: f2BarWidth,
                phase_f3_bar_width: f3BarWidth,
                phase_f1_bar_width_landscape: f1BarWidthLandscape,
                phase_f2_bar_width_landscape: f2BarWidthLandscape,
                phase_f3_bar_width_landscape: f3BarWidthLandscape,
                phase_balance_deviation: maxDeviation,
                phase_balance_deviation_color: deviationColor,
                phase_balance_status_color: statusColor,
                phase_balance_status_text: statusText
            };

        } catch (error) {
            logger.error('Failed to calculate phase balance metrics', { error: error.message });
            return {
                phase_f1_percentage: 33,
                phase_f2_percentage: 33,
                phase_f3_percentage: 34,
                phase_f1_bar_width: 59,
                phase_f2_bar_width: 59,
                phase_f3_bar_width: 61,
                phase_f1_bar_width_landscape: 119,
                phase_f2_bar_width_landscape: 119,
                phase_f3_bar_width_landscape: 122,
                phase_balance_deviation: 0,
                phase_balance_deviation_color: '#9CA3AF',
                phase_balance_status_color: '#9CA3AF',
                phase_balance_status_text: 'No Data'
            };
        }
    }
}

export default new ReportMetricsService();
