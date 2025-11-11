/**
 * Configuration Controller
 * Handles configuration management requests
 */

import configService from '../services/configService.js';
import logger from '../utils/logger.js';

class ConfigController {
  /**
   * Test database connection
   * POST /api/config/test-connection
   */
  async testConnection(req, res) {
    try {
      const config = req.body;

      if (!config.host || !config.database || !config.user) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: host, database, user'
        });
      }

      const result = await configService.testConnection(config);

      res.json(result);
    } catch (error) {
      logger.error('Connection test error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Auto-detect database schema
   * POST /api/config/detect-schema
   */
  async detectSchema(req, res) {
    try {
      const config = req.body;

      if (!config.host || !config.database || !config.user) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: host, database, user'
        });
      }

      const result = await configService.detectSchema(config);

      res.json(result);
    } catch (error) {
      logger.error('Schema detection error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Save database configuration
   * POST /api/config/database
   */
  async saveConfiguration(req, res) {
    try {
      const { name = 'default', ...config } = req.body;

      const result = await configService.saveConfiguration(name, config);

      res.json(result);
    } catch (error) {
      logger.error('Save configuration error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get configuration
   * GET /api/config/database/:name
   */
  async getConfiguration(req, res) {
    try {
      const { name } = req.params;

      const config = configService.getConfiguration(name);

      if (!config) {
        return res.status(404).json({
          success: false,
          error: 'Configuration not found'
        });
      }

      // Don't send password
      const { password, ...safeConfig } = config;

      res.json({
        success: true,
        data: safeConfig
      });
    } catch (error) {
      logger.error('Get configuration error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * List all configurations
   * GET /api/config/database
   */
  async listConfigurations(req, res) {
    try {
      const configs = configService.listConfigurations();

      res.json({
        success: true,
        data: configs
      });
    } catch (error) {
      logger.error('List configurations error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete configuration
   * DELETE /api/config/database/:name
   */
  async deleteConfiguration(req, res) {
    try {
      const { name } = req.params;

      await configService.deleteConfiguration(name);

      res.json({
        success: true,
        message: 'Configuration deleted successfully'
      });
    } catch (error) {
      logger.error('Delete configuration error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Export configuration
   * GET /api/config/export/:name
   */
  async exportConfiguration(req, res) {
    try {
      const { name } = req.params;

      const json = configService.exportConfiguration(name);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${name}-config.json"`);
      res.send(json);
    } catch (error) {
      logger.error('Export configuration error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Import configuration
   * POST /api/config/import
   */
  async importConfiguration(req, res) {
    try {
      const { name, config } = req.body;

      if (!name || !config) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, config'
        });
      }

      await configService.importConfiguration(
        typeof config === 'string' ? config : JSON.stringify(config),
        name
      );

      res.json({
        success: true,
        message: 'Configuration imported successfully'
      });
    } catch (error) {
      logger.error('Import configuration error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new ConfigController();
