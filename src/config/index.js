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

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_POOL_MIN: Joi.number().min(1).default(2),
  DB_POOL_MAX: Joi.number().min(1).default(10),

  // Puppeteer
  PUPPETEER_HEADLESS: Joi.string().valid('true', 'false', 'new').default('true'),
  PUPPETEER_TIMEOUT: Joi.number().min(1000).default(30000),
  PUPPETEER_EXECUTABLE_PATH: Joi.string().optional(),

  // Ollama (optional)
  OLLAMA_ENABLED: Joi.string().valid('true', 'false').default('false'),
  OLLAMA_HOST: Joi.string().uri().default('http://localhost:11434'),
  OLLAMA_MODEL: Joi.string().default('qwen2.5-coder:7b'),

  // Report settings
  REPORT_TIMEOUT: Joi.number().min(1000).default(60000),
  MAX_REPORT_SIZE_MB: Joi.number().min(1).default(50),

  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FILE: Joi.string().default('logs/app.log')
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

  ollama: {
    enabled: envVars.OLLAMA_ENABLED === 'true',
    host: envVars.OLLAMA_HOST,
    model: envVars.OLLAMA_MODEL
  },

  report: {
    timeout: envVars.REPORT_TIMEOUT,
    maxSizeMB: envVars.MAX_REPORT_SIZE_MB,
    maxSizeBytes: envVars.MAX_REPORT_SIZE_MB * 1024 * 1024
  },

  logging: {
    level: envVars.LOG_LEVEL,
    file: envVars.LOG_FILE
  }
};

export default config;
