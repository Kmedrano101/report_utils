/**
 * Configuration Module
 * Centralizes all application configuration with validation
 */

import dotenv from 'dotenv';
import Joi from 'joi';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

// Configuration schema validation
const envSchema = Joi.object({
  // Server
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  SERVER_PORT: Joi.number().port().default(3000),
  HOST: Joi.string().uri().default('http://localhost:3000'),

  // Database (optional - only needed if using TimescaleDB)
  DB_HOST: Joi.string().optional(),
  DB_PORT: Joi.number().port().default(5432),
  DB_NAME: Joi.string().optional(),
  DB_USER: Joi.string().optional(),
  DB_PASSWORD: Joi.string().optional(),
  DB_POOL_MIN: Joi.number().min(1).default(2),
  DB_POOL_MAX: Joi.number().min(1).default(10),

  // Puppeteer
  PUPPETEER_HEADLESS: Joi.string().valid('true', 'false', 'new').default('true'),
  PUPPETEER_TIMEOUT: Joi.number().min(1000).default(30000),
  PUPPETEER_EXECUTABLE_PATH: Joi.string().optional(),

  // Report settings
  REPORT_TIMEOUT: Joi.number().min(1000).default(60000),
  MAX_REPORT_SIZE_MB: Joi.number().min(1).default(50),

  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FILE: Joi.string().default('logs/app.log'),

  // VictoriaMetrics (external only)
  VICTORIA_METRICS_EXTERNAL_URL: Joi.string().uri().required(),
  VICTORIA_METRICS_EXTERNAL_TOKEN: Joi.string().required(),
  VICTORIA_METRICS_DEFAULT_SOURCE: Joi.string().valid('external').default('external')
}).unknown(true);

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Export configuration object
const config = {
  env: envVars.NODE_ENV,
  isDevelopment: envVars.NODE_ENV === 'development',
  isProduction: envVars.NODE_ENV === 'production',
  isTest: envVars.NODE_ENV === 'test',

  server: {
    port: envVars.SERVER_PORT,
    host: envVars.HOST
  },

  database: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    database: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
    min: envVars.DB_POOL_MIN,
    max: envVars.DB_POOL_MAX,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  },

  puppeteer: {
    headless: envVars.PUPPETEER_HEADLESS === 'true' || envVars.PUPPETEER_HEADLESS === 'new',
    timeout: envVars.PUPPETEER_TIMEOUT,
    executablePath: envVars.PUPPETEER_EXECUTABLE_PATH || null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  },

  report: {
    timeout: envVars.REPORT_TIMEOUT,
    maxSizeMB: envVars.MAX_REPORT_SIZE_MB,
    maxSizeBytes: envVars.MAX_REPORT_SIZE_MB * 1024 * 1024
  },

  logging: {
    level: envVars.LOG_LEVEL,
    file: envVars.LOG_FILE
  },

  victoriaMetrics: {
    externalUrl: envVars.VICTORIA_METRICS_EXTERNAL_URL,
    externalToken: envVars.VICTORIA_METRICS_EXTERNAL_TOKEN,
    defaultSource: 'external'
  }
};

export default config;
