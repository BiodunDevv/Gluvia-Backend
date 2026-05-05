const express = require("express");
const router = express.Router();
const controller = require("../controllers/notification.controller");
const { authenticate } = require("../middlewares/auth.middleware");

// Static routes must come before dynamic /:notificationId routes
router.post("/device/register", authenticate, controller.registerDeviceToken);
router.post("/device/unregister", authenticate, controller.unregisterDeviceToken);

router.get("/", authenticate, controller.listMyNotifications);
router.get("/:notificationId", authenticate, controller.getMyNotification);
router.post("/:notificationId/read", authenticate, controller.markMyNotificationRead);

module.exports = router;
