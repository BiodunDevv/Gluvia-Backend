/**
 * Check if user has required role(s)
 * @param  {...string} roles - Allowed roles
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
    }

    next();
  };
};

/**
 * Admin-only access
 */
const requireAdmin = requireRole('admin');

/**
 * Admin or health worker access
 */
const requireAdminOrHealthWorker = requireRole('admin', 'health_worker');

module.exports = {
  requireRole,
  requireAdmin,
  requireAdminOrHealthWorker,
};
