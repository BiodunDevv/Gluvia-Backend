const { verifyToken } = require("../utils/jwt.util");
const { isTokenRevoked } = require("../services/auth.service");
const User = require("../models/user.model");
const { sendError } = require("../utils/response.util");

/**
 * Authenticate JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, {
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "No authentication token provided",
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return sendError(res, {
        statusCode: 401,
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      });
    }

    // Check if token is revoked
    const revoked = await isTokenRevoked(
      decoded.jti,
      decoded.sub,
      decoded.iatMs || (decoded.iat ? decoded.iat * 1000 : undefined)
    );
    if (revoked) {
      return sendError(res, {
        statusCode: 401,
        code: "TOKEN_REVOKED",
        message: "Token has been revoked",
      });
    }

    // Get user
    const user = await User.findById(decoded.sub);
    if (!user || user.deleted) {
      return sendError(res, {
        statusCode: 401,
        code: "USER_NOT_FOUND",
        message: "User not found",
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
    return sendError(res, {
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "Authentication failed",
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
      const revoked = await isTokenRevoked(
        decoded.jti,
        decoded.sub,
        decoded.iatMs || (decoded.iat ? decoded.iat * 1000 : undefined)
      );

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
      return sendError(res, {
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    // Check if user has admin role
    if (req.user.role !== "admin") {
      return sendError(res, {
        statusCode: 403,
        code: "FORBIDDEN",
        message: "Access denied. Admin privileges required.",
      });
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return sendError(res, {
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "Authorization check failed",
    });
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  requireAdmin,
};
