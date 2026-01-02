const userService = require("../services/user.service");
const { asyncHandler } = require("../middlewares/error.middleware");

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User data export and management endpoints (NDPR compliance)
 */

/**
 * @swagger
 * /user/export:
 *   get:
 *     summary: Export user data (NDPR compliance) [USER]
 *     description: Requires user authentication. Export all user data for NDPR compliance including profile, meals, glucose logs, and all personal information.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User data exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User data exported successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                     mealLogs:
 *                       type: array
 *                       items:
 *                         type: object
 *                     glucoseLogs:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
const exportData = asyncHandler(async (req, res) => {
  const data = await userService.exportUserData(req.userId);
  res.json({
    success: true,
    message: "User data exported successfully",
    data,
  });
});

module.exports = {
  exportData,
};
