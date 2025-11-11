/**
 * Sensor Controller
 * Handles sensor data queries and operations
 */

import iotDataService from '../services/iotDataService.js';
import logger from '../utils/logger.js';
import { subDays } from 'date-fns';

class SensorController {
  /**
   * Get all sensors with optional filtering
   * GET /api/sensors
   */
  async getSensors(req, res) {
    try {
      const { sensor_type, location, is_active, building } = req.query;

      const filters = {};
      if (sensor_type) filters.sensor_type = sensor_type;
      if (location) filters.location = location;
      if (is_active !== undefined) filters.is_active = is_active === 'true';
      if (building) filters.building = building;

      const sensors = await iotDataService.getSensors(filters);

      res.json({
        success: true,
        data: sensors,
        count: sensors.length
      });

    } catch (error) {
      logger.error('Error fetching sensors', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get sensor by ID
   * GET /api/sensors/:id
   */
  async getSensorById(req, res) {
    try {
      const { id } = req.params;
      const sensor = await iotDataService.getSensorById(id);

      res.json({
        success: true,
        data: sensor
      });

    } catch (error) {
      logger.error('Error fetching sensor', { error: error.message, id: req.params.id });
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get sensor readings
   * GET /api/sensors/:id/readings
   */
  async getSensorReadings(req, res) {
    try {
      const { id } = req.params;
      const {
        startDate = subDays(new Date(), 7).toISOString(),
        endDate = new Date().toISOString(),
        aggregation = 'raw'
      } = req.query;

      const readings = await iotDataService.getSensorReadings(id, startDate, endDate, aggregation);

      res.json({
        success: true,
        data: readings,
        count: readings.length,
        parameters: {
          startDate,
          endDate,
          aggregation
        }
      });

    } catch (error) {
      logger.error('Error fetching sensor readings', { error: error.message, id: req.params.id });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get sensor statistics
   * GET /api/sensors/:id/statistics
   */
  async getSensorStatistics(req, res) {
    try {
      const { id } = req.params;
      const {
        startDate = subDays(new Date(), 30).toISOString(),
        endDate = new Date().toISOString()
      } = req.query;

      const statistics = await iotDataService.getSensorStatistics(id, startDate, endDate);

      res.json({
        success: true,
        data: statistics,
        parameters: {
          startDate,
          endDate
        }
      });

    } catch (error) {
      logger.error('Error fetching sensor statistics', { error: error.message, id: req.params.id });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get sensor types
   * GET /api/sensors/types
   */
  async getSensorTypes(req, res) {
    try {
      const sensorTypes = await iotDataService.getSensorTypes();

      res.json({
        success: true,
        data: sensorTypes
      });

    } catch (error) {
      logger.error('Error fetching sensor types', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Compare multiple sensors
   * POST /api/sensors/compare
   */
  async compareSensors(req, res) {
    try {
      const {
        sensorIds,
        startDate = subDays(new Date(), 7).toISOString(),
        endDate = new Date().toISOString(),
        aggregation = 'hourly'
      } = req.body;

      if (!sensorIds || !Array.isArray(sensorIds) || sensorIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'sensorIds array is required'
        });
      }

      const comparison = await iotDataService.getMultipleSensorData(sensorIds, startDate, endDate, aggregation);

      res.json({
        success: true,
        data: comparison,
        parameters: {
          startDate,
          endDate,
          aggregation
        }
      });

    } catch (error) {
      logger.error('Error comparing sensors', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new SensorController();
