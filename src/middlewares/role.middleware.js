const { sendError } = require("../utils/response.util");

/**
 * Check if user has required role(s)
 * @param  {...string} roles - Allowed roles
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, {
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.userRole)) {
      return sendError(res, {
        statusCode: 403,
        code: "FORBIDDEN",
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

/**
 * Admin-only access
 */
const requireAdmin = requireRole('admin');

module.exports = {
  requireRole,
  requireAdmin,
  requireAdminOrHealthWorker: requireAdmin,
};
