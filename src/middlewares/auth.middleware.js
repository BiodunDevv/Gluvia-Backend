const { verifyToken } = require("../utils/jwt.util");
const { isTokenRevoked } = require("../services/auth.service");
const User = require("../models/user.model");

/**
 * Authenticate JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "No authentication token provided",
        },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired token",
        },
      });
    }

    // Check if token is revoked
    const revoked = await isTokenRevoked(decoded.jti);
    if (revoked) {
      return res.status(401).json({
        error: {
          code: "TOKEN_REVOKED",
          message: "Token has been revoked",
        },
      });
    }

    // Get user
    const user = await User.findById(decoded.sub);
    if (!user || user.deleted) {
      return res.status(401).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    // Attach user and token info to request
    req.user = user;
    req.userId = user._id.toString();
    req.userRole = user.role;
    req.jti = decoded.jti;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Authentication failed",
      },
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyToken(token);
      const revoked = await isTokenRevoked(decoded.jti);

      if (!revoked) {
        const user = await User.findById(decoded.sub);
        if (user && !user.deleted) {
          req.user = user;
          req.userId = user._id.toString();
          req.userRole = user.role;
          req.jti = decoded.jti;
        }
      }
    } catch (error) {
      // Ignore errors for optional auth
    }

    next();
  } catch (error) {
    next();
  }
};

/**
 * Require admin role
 */
const requireAdmin = async (req, res, next) => {
  try {
    // First check if user is authenticated
    if (!req.user || !req.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        data: null,
      });
    }

    // Check if user has admin role
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
        data: null,
      });
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authorization check failed",
      data: null,
    });
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  requireAdmin,
};
