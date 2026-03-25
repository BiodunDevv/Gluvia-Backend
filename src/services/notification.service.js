const Notification = require("../models/notification.model");
const DeviceToken = require("../models/deviceToken.model");
const User = require("../models/user.model");
const auditService = require("./audit.service");
const axios = require("axios");
const config = require("../config");
const crypto = require("crypto");

const EXPO_PUSH_CHUNK_SIZE = 100;

const isExpoPushToken = (token) =>
  /^ExponentPushToken\[.+\]$/.test(token || "") ||
  /^ExpoPushToken\[.+\]$/.test(token || "");

const buildNotificationRoute = (notification) => {
  if (!notification?._id) {
    return "/notifications";
  }

  switch (notification.type) {
    case "meal":
      return "/meal-history";
    case "glucose":
      return "/(tabs)";
    default:
      return `/notifications/${notification._id}`;
  }
};

const chunkMessages = (messages, size = EXPO_PUSH_CHUNK_SIZE) => {
  const chunks = [];

  for (let index = 0; index < messages.length; index += size) {
    chunks.push(messages.slice(index, index + size));
  }

  return chunks;
};

const sendPushMessages = async (messages) => {
  if (!messages.length) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const chunk of chunkMessages(messages)) {
    try {
      const response = await axios.post(config.expo.pushUrl, chunk, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 10000,
      });

      const tickets = response.data?.data || [];
      sent += tickets.filter((ticket) => ticket.status === "ok").length;
      failed += tickets.filter((ticket) => ticket.status !== "ok").length;
    } catch (error) {
      failed += chunk.length;
    }
  }

  return { sent, failed };
};

const dispatchNotificationPush = async (notifications) => {
  const docs = Array.isArray(notifications) ? notifications : [notifications];
  const validNotifications = docs.filter(
    (notification) => notification?.userId && notification?._id
  );

  if (validNotifications.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const userIds = [
    ...new Set(validNotifications.map((notification) => String(notification.userId))),
  ];
  const deviceTokens = await DeviceToken.find({
    userId: { $in: userIds },
    active: true,
  }).lean();

  if (deviceTokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const deviceMap = deviceTokens.reduce((acc, deviceToken) => {
    const key = String(deviceToken.userId);
    acc[key] = acc[key] || [];
    acc[key].push(deviceToken);
    return acc;
  }, {});

  const messages = [];

  for (const notification of validNotifications) {
    const userDevices = deviceMap[String(notification.userId)] || [];

    for (const deviceToken of userDevices) {
      if (!isExpoPushToken(deviceToken.token)) {
        continue;
      }

      messages.push({
        to: deviceToken.token,
        sound: "default",
        title: notification.title,
        body: notification.body,
        data: {
          notificationId: String(notification._id),
          type: notification.type,
          route: buildNotificationRoute(notification),
          ...(notification.data || {}),
        },
      });
    }
  }

  return sendPushMessages(messages);
};

const buildDedupeKey = (...parts) =>
  crypto
    .createHash("sha1")
    .update(parts.filter(Boolean).join(":"))
    .digest("hex");

const listNotifications = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const query = { userId, deleted: false };

  const [result] = await Notification.aggregate([
    { $match: query },
    {
      $facet: {
        items: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
        ],
        total: [{ $count: "count" }],
        unread: [{ $match: { readAt: null } }, { $count: "count" }],
      },
    },
  ]);

  const items = result?.items || [];
  const total = result?.total?.[0]?.count || 0;
  const unreadCount = result?.unread?.[0]?.count || 0;

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    },
  };
};

const getNotificationById = async (userId, notificationId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    userId,
    deleted: false,
  })
    .select("type title body data readAt createdAt updatedAt")
    .lean();

  if (!notification) {
    throw new Error("Notification not found");
  }

  return notification;
};

const markNotificationRead = async (userId, notificationId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId, deleted: false },
    { $set: { readAt: new Date() } },
    { new: true }
  )
    .select("type title body data readAt createdAt updatedAt")
    .lean();

  if (!notification) {
    throw new Error("Notification not found");
  }

  return notification;
};

const createNotification = async ({
  userId,
  type = "system",
  title,
  body,
  data = {},
  dedupeKey,
}) => {
  if (dedupeKey) {
    const existing = await Notification.findOne({
      userId,
      dedupeKey,
      deleted: false,
    }).lean();

    if (existing) {
      return existing;
    }
  }

  let notification;
  try {
    notification = await Notification.create({
      userId,
      type,
      title,
      body,
      data,
      dedupeKey,
    });
  } catch (error) {
    if (error?.code === 11000 && dedupeKey) {
      return Notification.findOne({
        userId,
        dedupeKey,
        deleted: false,
      }).lean();
    }
    throw error;
  }

  await dispatchNotificationPush(notification);

  return notification;
};

const broadcastAdminNotification = async ({
  title,
  body,
  data = {},
  actorId,
}) => {
  const users = await User.find({ role: "user", deleted: false })
    .select("_id")
    .lean();

  if (users.length === 0) {
    return { created: 0 };
  }

  const dedupeKey = buildDedupeKey("admin_broadcast", title, body);
  const existingNotification = await Notification.findOne({
    dedupeKey,
    deleted: false,
  }).lean();

  if (existingNotification) {
    return { created: 0, duplicated: true };
  }

  const createdNotifications = await Notification.insertMany(
    users.map((user) => ({
      userId: user._id,
      type: "admin",
      title,
      body,
      data,
      dedupeKey,
    })),
    { ordered: false }
  );

  await dispatchNotificationPush(createdNotifications);

  if (actorId) {
    await auditService.logAudit({
      action: "admin_notification_broadcast",
      who: actorId,
      payload: { title, body },
    });
  }

  return { created: users.length };
};

const registerDeviceToken = async ({
  userId,
  deviceId,
  token,
  platform = "unknown",
}) => {
  return DeviceToken.findOneAndUpdate(
    { userId, deviceId },
    {
      $set: {
        token,
        platform,
        active: true,
        lastSeenAt: new Date(),
      },
    },
    { upsert: true, new: true }
  )
    .select("userId deviceId token platform active lastSeenAt createdAt updatedAt")
    .lean();
};

const unregisterDeviceToken = async ({ userId, deviceId }) => {
  await DeviceToken.findOneAndUpdate(
    { userId, deviceId },
    { $set: { active: false, lastSeenAt: new Date() } }
  );
  return { success: true };
};

module.exports = {
  listNotifications,
  getNotificationById,
  markNotificationRead,
  createNotification,
  broadcastAdminNotification,
  registerDeviceToken,
  unregisterDeviceToken,
  dispatchNotificationPush,
  buildDedupeKey,
};
