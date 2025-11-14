/**
 * IoT Report Utils - Main Entry Point
 * Express server for IoT data report generation
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import database from './config/database.js';
import pdfGenerationService from './services/pdfGenerationService.js';
import configService from './services/configService.js';
import logger from './utils/logger.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import languageMiddleware from './middleware/languageMiddleware.js';

// Import routes
import reportRoutes from './routes/reportRoutes.js';
import sensorRoutes from './routes/sensorRoutes.js';
import kpiRoutes from './routes/kpiRoutes.js';
import configRoutes from './routes/configRoutes.js';
import metricsRoutes from './routes/metricsRoutes.js';
import externalTimeSeriesRoutes from './routes/externalTimeSeriesRoutes.js';

// Get current directory for static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();

// ============================================================
// Middleware Setup
// ============================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for PDF generation and UI
  crossOriginResourcePolicy: false
}));

// Serve static files from public directory
const publicPath = join(__dirname, '../public');
app.use(express.static(publicPath));

// CORS
app.use(cors({
  origin: config.isDevelopment ? '*' : config.server.host,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Language detection
app.use(languageMiddleware);

// HTTP request logging
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Request ID and timing
app.use((req, res, next) => {
  req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.startTime = Date.now();
  next();
});

// ============================================================
// Routes
// ============================================================

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    const pdfHealth = await pdfGenerationService.healthCheck();

    // Service is healthy if PDF service works, database is optional
    const status = pdfHealth.healthy ? 200 : 503;

    res.status(status).json({
      success: status === 200,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealth,
      pdfService: pdfHealth,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: error.message
    });
  }
});

// API info (for API clients)
app.get('/api', (req, res) => {
  res.json({
    name: 'IoT Report Utils API',
    version: '1.0.0',
    description: 'Modular IoT data report generation system',
    endpoints: {
      health: '/health',
      reports: '/api/reports',
      sensors: '/api/sensors',
      kpis: '/api/kpis',
      config: '/api/config'
    },
    ui: '/',
    documentation: '/api/docs'
  });
});

// API Routes
app.use('/api/reports', reportRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/kpis', kpiRoutes);
app.use('/api/config', configRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/external-metrics', externalTimeSeriesRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================================
// Server Initialization
// ============================================================

async function startServer() {
  try {
    logger.info('Starting IoT Report Utils server...', {
      env: config.env,
      port: config.server.port
    });

    // Load database configurations
    await configService.loadConfigurations();
    logger.info('Configuration service initialized');

    // Connect to database (optional - continue if fails)
    try {
      await database.connect();
      logger.info('Database connection established');
    } catch (error) {
      logger.warn('Database connection failed - continuing without database', {
        error: error.message
      });
      logger.info('Application will run with limited functionality (no database)');
    }

    // Initialize PDF generation service
    await pdfGenerationService.initialize();
    logger.info('PDF generation service initialized');

    // Start Express server
    const server = app.listen(config.server.port, () => {
      logger.info(`Server running on port ${config.server.port}`, {
        url: `http://localhost:${config.server.port}`,
        environment: config.env
      });

      logger.info('Available endpoints:', {
        ui: `http://localhost:${config.server.port}/`,
        health: `http://localhost:${config.server.port}/health`,
        api: `http://localhost:${config.server.port}/api`,
        reports: `http://localhost:${config.server.port}/api/reports`,
        sensors: `http://localhost:${config.server.port}/api/sensors`,
        kpis: `http://localhost:${config.server.port}/api/kpis`,
        config: `http://localhost:${config.server.port}/api/config`
      });
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await pdfGenerationService.close();
          logger.info('PDF service closed');

          await database.disconnect();
          logger.info('Database connections closed');

          logger.info('Shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error: error.message });
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
    });

  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
