const pino = require('pino');
const config = require('../config');

const logger = pino({
  level: config.env === 'production' ? 'info' : 'debug',
  transport: config.env !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
});

/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error({
    err,
    req: {
      method: req.method,
      url: req.url,
      userId: req.userId,
    },
  }, 'Request error');

  // Default error response
  const error = {
    code: err.code || 'INTERNAL_ERROR',
    message: err.message || 'An unexpected error occurred',
  };

  // Add details in development
  if (config.env !== 'production' && err.stack) {
    error.stack = err.stack;
  }

  // Determine status code
  let statusCode = err.statusCode || 500;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    error.code = 'VALIDATION_ERROR';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    error.code = 'INVALID_ID';
    error.message = 'Invalid ID format';
  } else if (err.code === 11000) {
    statusCode = 409;
    error.code = 'DUPLICATE_ERROR';
    error.message = 'Resource already exists';
  }

  res.status(statusCode).json({ error });
};

/**
 * 404 handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
};

/**
 * Async handler wrapper
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  logger,
};
