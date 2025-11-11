/**
 * Configuration Service
 * Handles external database configurations and schema mapping
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Client } = pkg;
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ConfigService {
  constructor() {
    this.configPath = join(__dirname, '../../config/databases.json');
    this.configurations = new Map();
  }

  /**
   * Load database configurations from file
   */
  async loadConfigurations() {
    try {
      if (existsSync(this.configPath)) {
        const data = await readFile(this.configPath, 'utf-8');
        const configs = JSON.parse(data);

        for (const [name, config] of Object.entries(configs)) {
          this.configurations.set(name, config);
        }

        logger.info('Database configurations loaded', {
          count: this.configurations.size
        });
      } else {
        logger.info('No custom database configurations found');
      }
    } catch (error) {
      logger.error('Failed to load configurations', { error: error.message });
    }
  }

  /**
   * Save database configuration
   * @param {string} name - Configuration name
   * @param {Object} config - Database configuration
   */
  async saveConfiguration(name, config) {
    try {
      // Validate configuration
      this.validateConfig(config);

      // Add to configurations map
      this.configurations.set(name, {
        ...config,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Save to file
      await this.saveToFile();

      logger.info('Configuration saved', { name });

      return { success: true, message: 'Configuration saved successfully' };
    } catch (error) {
      logger.error('Failed to save configuration', { error: error.message });
      throw error;
    }
  }

  /**
   * Test database connection
   * @param {Object} config - Database configuration
   * @returns {Promise<Object>} Test result
   */
  async testConnection(config) {
    const client = new Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl === 'require' ? { rejectUnauthorized: false } : config.ssl === 'prefer',
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();

      // Test query
      const result = await client.query('SELECT version(), NOW() as current_time');

      // Check for TimescaleDB
      let timescaleVersion = null;
      try {
        const tsResult = await client.query(
          "SELECT extversion FROM pg_extension WHERE extname = 'timescaledb'"
        );
        if (tsResult.rows.length > 0) {
          timescaleVersion = tsResult.rows[0].extversion;
        }
      } catch (err) {
        // TimescaleDB not installed
      }

      await client.end();

      logger.info('Connection test successful', {
        host: config.host,
        database: config.database
      });

      return {
        success: true,
        message: 'Connection successful',
        details: {
          version: result.rows[0].version,
          currentTime: result.rows[0].current_time,
          timescaleVersion
        }
      };
    } catch (error) {
      logger.error('Connection test failed', {
        error: error.message,
        host: config.host
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Auto-detect database schema
   * @param {Object} config - Database configuration
   * @returns {Promise<Object>} Detected schema
   */
  async detectSchema(config) {
    const client = new Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();

      // Find tables that might be sensors/readings
      const tablesQuery = `
        SELECT
          schemaname || '.' || tablename as full_name,
          tablename
        FROM pg_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema', '_timescaledb_catalog', '_timescaledb_internal', '_timescaledb_cache', '_timescaledb_config')
        ORDER BY schemaname, tablename
      `;

      const tables = await client.query(tablesQuery);

      // Try to identify sensor-related tables
      const schema = {
        sensors: null,
        readings: null,
        sensorTypes: null
      };

      for (const row of tables.rows) {
        const name = row.tablename.toLowerCase();
        const fullName = row.full_name;

        if (name.includes('sensor') && name.includes('type')) {
          schema.sensorTypes = fullName;
        } else if (name.includes('sensor') && !name.includes('reading')) {
          schema.sensors = fullName;
        } else if (name.includes('reading') || name.includes('measurement') || name.includes('data')) {
          schema.readings = fullName;
        }
      }

      await client.end();

      logger.info('Schema detection completed', { schema });

      return {
        success: true,
        schema,
        availableTables: tables.rows.map(r => r.full_name)
      };
    } catch (error) {
      logger.error('Schema detection failed', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get configuration by name
   * @param {string} name - Configuration name
   * @returns {Object} Configuration
   */
  getConfiguration(name) {
    return this.configurations.get(name);
  }

  /**
   * List all configurations
   * @returns {Array} List of configuration names
   */
  listConfigurations() {
    return Array.from(this.configurations.keys());
  }

  /**
   * Delete configuration
   * @param {string} name - Configuration name
   */
  async deleteConfiguration(name) {
    if (!this.configurations.has(name)) {
      throw new Error(`Configuration '${name}' not found`);
    }

    this.configurations.delete(name);
    await this.saveToFile();

    logger.info('Configuration deleted', { name });
  }

  /**
   * Validate configuration object
   * @private
   */
  validateConfig(config) {
    const required = ['host', 'port', 'database', 'user'];

    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (typeof config.port !== 'number' || config.port < 1 || config.port > 65535) {
      throw new Error('Invalid port number');
    }
  }

  /**
   * Save configurations to file
   * @private
   */
  async saveToFile() {
    try {
      // Ensure directory exists
      const dir = dirname(this.configPath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      // Convert Map to object
      const configObj = {};
      for (const [name, config] of this.configurations) {
        // Don't save password to file
        const { password, ...safeConfig } = config;
        configObj[name] = safeConfig;
      }

      await writeFile(this.configPath, JSON.stringify(configObj, null, 2));
      logger.debug('Configurations saved to file', { path: this.configPath });
    } catch (error) {
      logger.error('Failed to save configurations to file', { error: error.message });
      throw error;
    }
  }

  /**
   * Export configuration as JSON
   * @param {string} name - Configuration name
   * @returns {string} JSON string
   */
  exportConfiguration(name) {
    const config = this.getConfiguration(name);
    if (!config) {
      throw new Error(`Configuration '${name}' not found`);
    }

    // Remove sensitive data
    const { password, ...safeConfig } = config;
    return JSON.stringify(safeConfig, null, 2);
  }

  /**
   * Import configuration from JSON
   * @param {string} json - JSON string
   * @param {string} name - Configuration name
   */
  async importConfiguration(json, name) {
    try {
      const config = JSON.parse(json);
      await this.saveConfiguration(name, config);
    } catch (error) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
  }
}

export default new ConfigService();
