/**
 * Database Connection Module
 * PostgreSQL/TimescaleDB connection with connection pooling
 */

import pkg from 'pg';
const { Pool } = pkg;
import config from './index.js';
import logger from '../utils/logger.js';

class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  /**
   * Initialize database connection pool
   */
  async connect() {
    try {
      this.pool = new Pool(config.database);

      // Test connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      client.release();

      this.isConnected = true;
      logger.info('Database connected successfully', {
        database: config.database.database,
        host: config.database.host,
        time: result.rows[0].current_time
      });

      // Log TimescaleDB version if available
      try {
        const tsResult = await this.query("SELECT extversion FROM pg_extension WHERE extname = 'timescaledb'");
        if (tsResult.rows.length > 0) {
          logger.info('TimescaleDB extension detected', {
            version: tsResult.rows[0].extversion
          });
        }
      } catch (err) {
        logger.warn('TimescaleDB extension not found');
      }

      // Setup event handlers
      this.pool.on('error', (err) => {
        logger.error('Unexpected database pool error', { error: err.message });
      });

      this.pool.on('connect', () => {
        logger.debug('New database connection established');
      });

      this.pool.on('remove', () => {
        logger.debug('Database connection removed from pool');
      });

      return this.pool;
    } catch (error) {
      logger.error('Database connection failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute a query with automatic timing
   * @param {string} text - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(text, params = []) {
    const start = Date.now();

    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      if (config.isDevelopment) {
        logger.logQuery(text, duration);
      }

      return result;
    } catch (error) {
      logger.error('Database query error', {
        query: text.substring(0, 200),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   * @returns {Promise<PoolClient>}
   */
  async getClient() {
    return await this.pool.connect();
  }

  /**
   * Execute a transaction
   * @param {Function} callback - Function that receives client and executes queries
   * @returns {Promise<any>} Transaction result
   */
  async transaction(callback) {
    const client = await this.getClient();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction rolled back', { error: error.message });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check database health
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as alive, NOW() as timestamp');
      return {
        healthy: true,
        timestamp: result.rows[0].timestamp,
        poolTotal: this.pool.totalCount,
        poolIdle: this.pool.idleCount,
        poolWaiting: this.pool.waitingCount
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Get pool statistics
   * @returns {Object} Pool stats
   */
  getPoolStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount
    };
  }

  /**
   * Close all database connections
   */
  async disconnect() {
    if (this.pool) {
      try {
        await this.pool.end();
        this.isConnected = false;
        logger.info('Database connections closed');
      } catch (error) {
        logger.error('Error closing database connections', { error: error.message });
        throw error;
      }
    }
  }
}

// Export singleton instance
const database = new Database();
export default database;
