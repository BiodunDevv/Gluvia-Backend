const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { authenticate } = require("../middlewares/auth.middleware");

// NDPR Compliance - Data export
router.get("/export", authenticate, userController.exportData);

module.exports = router;
