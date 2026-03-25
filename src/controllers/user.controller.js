const userService = require("../services/user.service");
const { asyncHandler } = require("../middlewares/error.middleware");
const { sendSuccess } = require("../utils/response.util");
const settingsService = require("../services/settings.service");
const { t } = require("../utils/i18n.util");

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

  return sendSuccess(res, {
    message: t("user_export_success", "english"),
    data,
  });
});

const getMobileAppSettings = asyncHandler(async (_req, res) => {
  const settings = await settingsService.getAppSettings();

  return sendSuccess(res, {
    data: settings,
  });
});

module.exports = {
  exportData,
  getMobileAppSettings,
};
