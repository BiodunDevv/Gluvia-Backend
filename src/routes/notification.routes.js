const express = require("express");
const router = express.Router();
const controller = require("../controllers/notification.controller");
const { authenticate } = require("../middlewares/auth.middleware");

router.get("/", authenticate, controller.listMyNotifications);
router.get("/:notificationId", authenticate, controller.getMyNotification);
router.post("/:notificationId/read", authenticate, controller.markMyNotificationRead);
router.post("/device/register", authenticate, controller.registerDeviceToken);
router.post("/device/unregister", authenticate, controller.unregisterDeviceToken);

module.exports = router;
