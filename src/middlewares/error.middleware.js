const pino = require("pino");
const config = require("../config");
const { sendError } = require("../utils/response.util");

const logger = pino({
  level: config.env === "production" ? "info" : "debug",
  transport:
    config.env !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});

/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error(
    {
      code: err.code,
      name: err.name,
      message: err.message,
      statusCode: err.statusCode,
      method: req.method,
      url: req.url,
      userId: req.userId,
    },
    "Request error"
  );

  // Default error response
  const error = {
    code: err.code || "INTERNAL_ERROR",
    message: err.message || "An unexpected error occurred",
  };

  // Add details in development
  if (config.env !== "production" && err.stack) {
    error.stack = err.stack;
  }

  // Determine status code
  let statusCode = err.statusCode || 500;

  if (err.name === "ValidationError") {
    statusCode = 400;
    error.code = "VALIDATION_ERROR";
  } else if (err.name === "CastError") {
    statusCode = 400;
    error.code = "INVALID_ID";
    error.message = "Invalid ID format";
  } else if (err.code === 11000) {
    statusCode = 409;
    error.code = "DUPLICATE_ERROR";
    error.message = "Resource already exists";
  } else if (err.code === "ACCOUNT_NOT_FOUND" || err.code === "INVALID_PASSWORD") {
    // Always 401 — never reveal whether the account exists (security best practice)
    statusCode = 401;
    error.code = "INVALID_CREDENTIALS";
    error.message = "Invalid email or password";
  }

  return sendError(res, {
    statusCode,
    code: error.code,
    message: error.message,
    details: error.details,
  });
};

/**
 * 404 handler
 */
const notFoundHandler = (req, res) => {
  return sendError(res, {
    statusCode: 404,
    code: "NOT_FOUND",
    message: "Route not found",
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
