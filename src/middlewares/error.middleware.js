const pino = require("pino");
const config = require("../config");

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
  // Enhanced console logging for mobile debugging
  console.log("\n" + "🚨".repeat(40));
  console.log("❌ ERROR OCCURRED");
  console.log("🚨".repeat(40));
  console.log(`📱 Endpoint: ${req.method} ${req.url}`);
  console.log(`🌐 Origin: ${req.headers.origin || "No origin"}`);
  console.log(`📍 IP: ${req.ip || req.connection.remoteAddress}`);
  console.log(`🔴 Error Name: ${err.name}`);
  console.log(`💬 Error Message: ${err.message}`);

  if (req.body && Object.keys(req.body).length > 0) {
    console.log("📦 Request Body:", JSON.stringify(req.body, null, 2));
  }

  if (err.stack) {
    console.log("📚 Stack Trace:");
    console.log(err.stack);
  }
  console.log("🚨".repeat(40) + "\n");

  // Log error
  logger.error(
    {
      err,
      req: {
        method: req.method,
        url: req.url,
        userId: req.userId,
        body: req.body,
        headers: req.headers,
      },
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
  } else if (err.code === "ACCOUNT_NOT_FOUND") {
    statusCode = 404;
  } else if (err.code === "INVALID_PASSWORD") {
    statusCode = 401;
  }

  res.status(statusCode).json({ error });
};

/**
 * 404 handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
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
