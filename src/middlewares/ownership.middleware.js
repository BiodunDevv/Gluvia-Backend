/**
 * Verify that the user owns the resource
 * Used for routes that access user-specific resources
 * @param {Function} getResourceUserId - Function to extract userId from resource
 */
const verifyOwnership = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      // Admin can access any resource
      if (req.userRole === 'admin') {
        return next();
      }

      // Get resource userId
      const resourceUserId = await getResourceUserId(req);

      if (!resourceUserId) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found',
          },
        });
      }

      // Check ownership
      if (resourceUserId.toString() !== req.userId) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this resource',
          },
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Verify user is accessing their own profile
 */
const verifySelfAccess = (userIdParam = 'id') => {
  return (req, res, next) => {
    // Admin can access any profile
    if (req.userRole === 'admin') {
      return next();
    }

    const targetUserId = req.params[userIdParam];

    if (targetUserId !== req.userId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only access your own profile',
        },
      });
    }

    next();
  };
};

module.exports = {
  verifyOwnership,
  verifySelfAccess,
};
