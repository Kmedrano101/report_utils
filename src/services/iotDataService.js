/**
 * IoT Data Service
 * Handles all IoT sensor data queries, aggregations, and KPI calculations
 */

import database from '../config/database.js';
import logger from '../utils/logger.js';
import { format, parseISO, subDays } from 'date-fns';

const isMissingRelationError = error =>
  error?.code === '42P01' || /relation .* does not exist/i.test(error?.message || '');

class IotDataService {
  /**
   * Get all sensors with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of sensors
   */
  async getSensors(filters = {}) {
    try {
      let query = `
        SELECT
          s.id,
          s.sensor_code,
          s.name,
          s.location,
          s.latitude,
          s.longitude,
          s.is_active,
          s.metadata,
          st.name as sensor_type,
          st.unit,
          lr.value as latest_value,
          lr.time as latest_reading_time
        FROM iot.sensors s
        JOIN iot.sensor_types st ON s.sensor_type_id = st.id
        LEFT JOIN iot.latest_sensor_readings lr ON s.id = lr.sensor_id
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (filters.sensor_type) {
        query += ` AND st.name = $${paramCount++}`;
        params.push(filters.sensor_type);
      }

      if (filters.location) {
        query += ` AND s.location ILIKE $${paramCount++}`;
        params.push(`%${filters.location}%`);
      }

      if (filters.is_active !== undefined) {
        query += ` AND s.is_active = $${paramCount++}`;
        params.push(filters.is_active);
      }

      if (filters.building) {
        query += ` AND s.metadata->>'building' = $${paramCount++}`;
        params.push(filters.building);
      }

      query += ` ORDER BY s.name`;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      if (isMissingRelationError(error)) {
        logger.warn('Sensors tables not available, returning empty list', { filters });
        return [];
      }
      logger.error('Error fetching sensors', { error: error.message, filters });
      throw error;
    }
  }

  /**
   * Get sensor by ID or sensor_code
   * @param {number|string} identifier - Sensor ID or sensor_code
   * @returns {Promise<Object>} Sensor details
   */
  async getSensorById(identifier) {
    try {
      const query = `
        SELECT
          s.*,
          st.name as sensor_type,
          st.unit,
          st.min_value,
          st.max_value,
          lr.value as latest_value,
          lr.time as latest_reading_time,
          lr.quality as latest_quality
        FROM iot.sensors s
        JOIN iot.sensor_types st ON s.sensor_type_id = st.id
        LEFT JOIN iot.latest_sensor_readings lr ON s.id = lr.sensor_id
        WHERE s.sensor_code = $1
          OR (s.id = CASE WHEN $1 ~ '^[0-9]+$' THEN $1::integer ELSE NULL END)
      `;

      const result = await database.query(query, [String(identifier)]);

      if (result.rows.length === 0) {
        throw new Error(`Sensor not found: ${identifier}`);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching sensor', { error: error.message, identifier });
      throw error;
    }
  }

  /**
   * Get sensor readings for a date range
   * @param {number|string} sensorId - Sensor ID or code
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @param {string} aggregation - Aggregation level: 'raw', 'hourly', 'daily'
   * @returns {Promise<Array>} Sensor readings
   */
  async getSensorReadings(sensorId, startDate, endDate, aggregation = 'raw') {
    try {
      const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
      const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

      let query;
      const params = [sensorId, start, end];

      const sensorIdParam = String(sensorId);

      if (aggregation === 'raw') {
        query = `
          SELECT
            time,
            value,
            quality
          FROM iot.sensor_readings sr
          JOIN iot.sensors s ON sr.sensor_id = s.id
          WHERE (s.sensor_code = $1 OR (s.id = CASE WHEN $1 ~ '^[0-9]+$' THEN $1::integer ELSE NULL END))
            AND time BETWEEN $2 AND $3
          ORDER BY time ASC
        `;
      } else if (aggregation === 'hourly') {
        query = `
          SELECT
            bucket as time,
            avg_value as value,
            min_value,
            max_value,
            reading_count,
            avg_quality as quality
          FROM iot.sensor_readings_hourly srh
          JOIN iot.sensors s ON srh.sensor_id = s.id
          WHERE (s.sensor_code = $1 OR (s.id = CASE WHEN $1 ~ '^[0-9]+$' THEN $1::integer ELSE NULL END))
            AND bucket BETWEEN $2 AND $3
          ORDER BY bucket ASC
        `;
      } else if (aggregation === 'daily') {
        query = `
          SELECT
            bucket as time,
            avg_value as value,
            min_value,
            max_value,
            reading_count,
            stddev_value
          FROM iot.sensor_readings_daily srd
          JOIN iot.sensors s ON srd.sensor_id = s.id
          WHERE (s.sensor_code = $1 OR (s.id = CASE WHEN $1 ~ '^[0-9]+$' THEN $1::integer ELSE NULL END))
            AND bucket BETWEEN $2 AND $3
          ORDER BY bucket ASC
        `;
      } else {
        throw new Error(`Invalid aggregation level: ${aggregation}`);
      }

      params[0] = sensorIdParam;
      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      if (isMissingRelationError(error)) {
        logger.warn('Sensor readings tables not available, returning empty list', { sensorId, aggregation });
        return [];
      }
      logger.error('Error fetching sensor readings', { error: error.message, sensorId, startDate, endDate });
      throw error;
    }
  }

  /**
   * Get sensor statistics for a date range
   * @param {number|string} sensorId - Sensor ID or code
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Object>} Statistics
   */
  async getSensorStatistics(sensorId, startDate, endDate) {
    try {
      const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
      const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

      const query = `
        SELECT
          COUNT(*) as reading_count,
          AVG(value) as avg_value,
          MIN(value) as min_value,
          MAX(value) as max_value,
          STDDEV(value) as stddev_value,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as median_value,
          AVG(quality) as avg_quality,
          MIN(time) as first_reading,
          MAX(time) as last_reading
        FROM iot.sensor_readings sr
        JOIN iot.sensors s ON sr.sensor_id = s.id
        WHERE (s.sensor_code = $1 OR (s.id = CASE WHEN $1 ~ '^[0-9]+$' THEN $1::integer ELSE NULL END))
          AND time BETWEEN $2 AND $3
      `;

      const result = await database.query(query, [String(sensorId), start, end]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error calculating sensor statistics', { error: error.message, sensorId });
      throw error;
    }
  }

  /**
   * Get multiple sensors' data for comparison
   * @param {Array<number>} sensorIds - Array of sensor IDs
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @param {string} aggregation - Aggregation level
   * @returns {Promise<Object>} Grouped sensor data
   */
  async getMultipleSensorData(sensorIds, startDate, endDate, aggregation = 'hourly') {
    try {
      const readings = await Promise.all(
        sensorIds.map(async (sensorId) => {
          const sensor = await this.getSensorById(sensorId);
          const data = await this.getSensorReadings(sensorId, startDate, endDate, aggregation);
          return {
            sensor,
            readings: data
          };
        })
      );

      return readings;
    } catch (error) {
      logger.error('Error fetching multiple sensor data', { error: error.message, sensorIds });
      throw error;
    }
  }

  /**
   * Calculate KPI value
   * @param {string} kpiName - KPI name
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Object>} KPI result
   */
  async calculateKPI(kpiName, startDate, endDate) {
    try {
      const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
      const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

      // Get KPI definition
      const kpiDef = await database.query(
        'SELECT * FROM reports.kpi_definitions WHERE name = $1 AND is_active = true',
        [kpiName]
      );

      if (kpiDef.rows.length === 0) {
        throw new Error(`KPI not found: ${kpiName}`);
      }

      const kpi = kpiDef.rows[0];
      let result;

      if (kpi.calculation_type === 'custom' && kpi.sql_query) {
        // Execute custom SQL query
        result = await database.query(kpi.sql_query);
      } else {
        // Standard aggregation
        const aggFunction = kpi.calculation_type.toUpperCase();
        const query = `
          SELECT
            ${aggFunction}(value) as kpi_value,
            COUNT(*) as sample_count
          FROM iot.sensor_readings sr
          JOIN iot.sensors s ON sr.sensor_id = s.id
          WHERE s.sensor_type_id = $1
            AND time BETWEEN $2 AND $3
            AND s.is_active = true
        `;

        result = await database.query(query, [kpi.sensor_type_id, start, end]);
      }

      return {
        kpi_name: kpi.name,
        description: kpi.description,
        value: result.rows[0].kpi_value || result.rows[0].uptime_percentage,
        unit: kpi.unit,
        calculation_type: kpi.calculation_type,
        period: { start: start, end: end },
        sample_count: result.rows[0].sample_count || null
      };
    } catch (error) {
      logger.error('Error calculating KPI', { error: error.message, kpiName });
      throw error;
    }
  }

  /**
   * Get all KPIs for a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array>} All KPI values
   */
  async getAllKPIs(startDate, endDate) {
    try {
      const kpisQuery = await database.query(
        'SELECT name FROM reports.kpi_definitions WHERE is_active = true ORDER BY name'
      );

      const kpiValues = await Promise.all(
        kpisQuery.rows.map(kpi => this.calculateKPI(kpi.name, startDate, endDate))
      );

      return kpiValues;
    } catch (error) {
      logger.error('Error fetching all KPIs', { error: error.message });
      throw error;
    }
  }

  /**
   * Get sensor types
   * @returns {Promise<Array>} List of sensor types
   */
  async getSensorTypes() {
    try {
      const result = await database.query(`
        SELECT * FROM iot.sensor_types ORDER BY name
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching sensor types', { error: error.message });
      throw error;
    }
  }

  /**
   * Get building summary
   * @param {string} building - Building name
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Object>} Building summary
   */
  async getBuildingSummary(building, startDate, endDate) {
    try {
      const sensors = await this.getSensors({ building, is_active: true });
      const sensorIds = sensors.map(s => s.id);

      if (sensorIds.length === 0) {
        return {
          building,
          sensors: [],
          kpis: []
        };
      }

      const sensorData = await this.getMultipleSensorData(sensorIds, startDate, endDate, 'hourly');

      return {
        building,
        period: { start: startDate, end: endDate },
        sensor_count: sensors.length,
        sensors: sensorData
      };
    } catch (error) {
      logger.error('Error fetching building summary', { error: error.message, building });
      throw error;
    }
  }
}

export default new IotDataService();
