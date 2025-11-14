/**
 * Configuration Controller
 * Handles configuration management requests
 */

import configService from '../services/configService.js';
import database from '../config/database.js';
import victoriaMetrics from '../services/victoriaMetricsService.js';
import logger from '../utils/logger.js';

class ConfigController {
  /**
   * Test database connection
   * POST /api/config/test-connection
   */
  async testConnection(req, res) {
    try {
      const config = req.body;

      logger.info('Test connection request received', {
        host: config?.host,
        port: config?.port,
        database: config?.database,
        user: config?.user
      });

      if (!config.host || !config.database || !config.user) {
        logger.warn('Missing required fields for connection test');
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: host, database, user'
        });
      }

      const result = await configService.testConnection(config);

      logger.info('Connection test result', { success: result.success });

      res.json(result);
    } catch (error) {
      logger.error('Connection test error', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message || String(error) || 'Unknown error'
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

  /**
   * Save VictoriaMetrics configuration
   * POST /api/config/victoriametrics
   */
  async saveVictoriaMetricsConfig(req, res) {
    try {
      const { url, token, defaultSource, timeout, retries, sslVerify } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'API Endpoint URL is required'
        });
      }

      logger.info('Saving VictoriaMetrics configuration', { url, defaultSource });

      // Save to .env file
      const result = await configService.saveVictoriaMetricsConfig({
        url,
        token,
        defaultSource,
        timeout,
        retries,
        sslVerify
      });

      // Update VictoriaMetrics service configuration and test connection
      const vmConfig = { url, token, defaultSource };
      logger.info('Attempting to update VictoriaMetrics configuration');
      const updateResult = await victoriaMetrics.updateConfig(vmConfig);

      if (updateResult.connected) {
        logger.info('VictoriaMetrics connection successful');
        res.json({
          success: true,
          message: 'VictoriaMetrics configuration saved and connection established successfully.',
          connected: true,
          config: result
        });
      } else {
        logger.warn('VictoriaMetrics configuration saved but connection failed', { error: updateResult.error });
        res.json({
          success: true,
          message: 'VictoriaMetrics configuration saved but connection failed. Check your credentials and try again.',
          connected: false,
          connectionError: updateResult.error,
          config: result
        });
      }
    } catch (error) {
      logger.error('Save VictoriaMetrics config error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update local database configuration to .env
   * POST /api/config/database-env
   */
  async updateDatabaseEnv(req, res) {
    try {
      const { host, port, database: dbName, user, password, poolMin, poolMax } = req.body;

      if (!host || !dbName || !user) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: host, database, user'
        });
      }

      logger.info('Updating database configuration', { host, port, database: dbName, user });

      // Save to .env file
      const result = await configService.updateDatabaseEnv({
        host,
        port,
        database: dbName,
        user,
        password,
        poolMin,
        poolMax
      });

      // Attempt to reconnect with new configuration
      const dbConfig = {
        host,
        port: port || 5432,
        database: dbName,
        user,
        password,
        min: poolMin || 2,
        max: poolMax || 10
      };

      logger.info('Attempting to reconnect database with new configuration');
      const reconnectResult = await database.reconnect(dbConfig);

      if (reconnectResult.success) {
        logger.info('Database reconnected successfully');
        res.json({
          success: true,
          message: 'Database configuration saved and connection established successfully.',
          connected: true,
          config: result
        });
      } else {
        logger.warn('Database configuration saved but connection failed', { error: reconnectResult.error });
        res.json({
          success: true,
          message: 'Database configuration saved but connection failed. Check your credentials and try again.',
          connected: false,
          connectionError: reconnectResult.error,
          config: result
        });
      }
    } catch (error) {
      logger.error('Update database env error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new ConfigController();
