/**
 * Error Handling Middleware
 * Global error handler for Express
 */

import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * 404 Not Found Handler
 */
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Resource not found',
    path: req.originalUrl
  });
};

/**
 * Global Error Handler
 */
export const errorHandler = (err, req, res, next) => {
  // Log error
  logger.logError(err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Error response
  const errorResponse = {
    success: false,
    error: err.message || 'Internal server error'
  };

  // Include stack trace in development
  if (config.isDevelopment) {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Async route wrapper to catch errors
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
