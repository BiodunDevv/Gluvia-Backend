const express = require("express");
const router = express.Router();
const syncController = require("../controllers/sync.controller");
const { authenticate } = require("../middlewares/auth.middleware");

// Upload endpoints for meals and glucose
router.post("/meals", authenticate, syncController.uploadMealLogs);
router.post("/glucose", authenticate, syncController.uploadGlucoseLogs);

// Sync data retrieval
router.get("/updates", authenticate, syncController.getDeltaUpdates);
router.get("/full", authenticate, syncController.getFullSync);
router.get("/aggregations", authenticate, syncController.getUserAggregations);

module.exports = router;
