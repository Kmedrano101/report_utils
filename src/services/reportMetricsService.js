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
     * @returns {Promise<Object>} All calculated metrics
     */
    async getReportMetrics(params) {
        const { startDate, endDate, source = this.defaultSource } = params;

        try {
            logger.info('Calculating report metrics', { startDate, endDate, source });

            // Calculate all metrics in parallel
            const [
                temperature,
                humidity,
                sound,
                power,
                sensorCounts
            ] = await Promise.all([
                this.getTemperatureMetrics(startDate, endDate, source),
                this.getHumidityMetrics(startDate, endDate, source),
                this.getSoundMetrics(startDate, endDate, source),
                this.getPowerMetrics(startDate, endDate, source),
                this.getSensorCounts(source)
            ]);

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
     * Get sensor counts (total, active, offline)
     * Only counts sensors: t1-t30, s1-s7, c1-c2
     * Total = sensors with data in last 1 hour (actively sending)
     * Expected = 39 sensors (t1-t30=30, s1-s7=7, c1-c2=2)
     */
    async getSensorCounts(source) {
        try {
            // Filter for specific sensors: t1-t30, s1-s7, c1-c2
            // Using regex to match: t[1-9]|t[12][0-9]|t30|s[1-7]|c[12]
            const sensorFilter = 'sensor_name=~"t[1-9]|t[12][0-9]|t30|s[1-7]|c[12]"';

            // Expected total sensors: t1-t30 (30) + s1-s7 (7) + c1-c2 (2) = 39
            const expectedTotal = 39;

            // Query to get sensors with recent data (last 1 hour = active)
            const activeSensorsQuery = `count(count by (sensor_name) (iot_sensor_reading{${sensorFilter}}[1h]))`;

            const activeResult = await victoriaMetricsService.query(activeSensorsQuery, { source });

            const active = parseInt(activeResult.data?.result?.[0]?.values?.[0] || 0);
            const total = expectedTotal;
            const offline = total - active;

            return { total, active, offline };

        } catch (error) {
            logger.error('Failed to get sensor counts', { error: error.message });
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
}

export default new ReportMetricsService();
