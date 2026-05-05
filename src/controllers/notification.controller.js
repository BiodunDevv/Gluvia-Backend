const { asyncHandler } = require("../middlewares/error.middleware");
const { sendSuccess, sendError } = require("../utils/response.util");
const notificationService = require("../services/notification.service");

const listMyNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const result = await notificationService.listNotifications(
    req.userId,
    Number(page),
    Number(limit)
  );

  return sendSuccess(res, {
    data: result.items,
    meta: result.meta,
  });
});

const getMyNotification = asyncHandler(async (req, res) => {
  const notification = await notificationService.getNotificationById(
    req.userId,
    req.params.notificationId
  );

  return sendSuccess(res, { data: notification });
});

const markMyNotificationRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markNotificationRead(
    req.userId,
    req.params.notificationId
  );

  return sendSuccess(res, { data: notification });
});

const registerDeviceToken = asyncHandler(async (req, res) => {
  const { deviceId, token, platform, announceLogin } = req.body;

  if (!deviceId || !token) {
    return sendError(res, {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "deviceId and token are required",
    });
  }

  const record = await notificationService.registerDeviceToken({
    userId: req.userId,
    deviceId,
    token,
    platform,
  });

  if (announceLogin) {
    await notificationService.createNotification({
      userId: req.userId,
      type: "system",
      title: "Login detected",
      body: "You just signed in to your Gluvia AI account.",
      data: {},
      dedupeKey: notificationService.buildDedupeKey(
        "login_detected",
        req.userId,
        deviceId,
        req.jti || "session"
      ),
    });
  }

  return sendSuccess(res, { data: record });
});

const unregisterDeviceToken = asyncHandler(async (req, res) => {
  const { deviceId } = req.body;

  if (!deviceId) {
    return sendError(res, {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "deviceId is required",
    });
  }

  const result = await notificationService.unregisterDeviceToken({
    userId: req.userId,
    deviceId,
  });

  return sendSuccess(res, { data: result });
});

module.exports = {
  listMyNotifications,
  getMyNotification,
  markMyNotificationRead,
  registerDeviceToken,
  unregisterDeviceToken,
};
