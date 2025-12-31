const rateLimit = require("express-rate-limit");
const config = require("../config");

/**
 * General rate limiter for all routes
 */
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for auth routes
 */
const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // Use config from .env
  max: config.rateLimit.max, // Use config from .env
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts, please try again later",
    },
  },
  skipSuccessfulRequests: true,
});

/**
 * Upload rate limiter
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Upload limit exceeded, please try again later",
    },
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter,
};
