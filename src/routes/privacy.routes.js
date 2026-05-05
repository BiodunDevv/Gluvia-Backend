const express = require("express");
const router = express.Router();
const privacyController = require("../controllers/privacy.controller");

router.post("/account-deletion/request-code", privacyController.requestDeletionCode);
router.post("/account-deletion/verify-code", privacyController.verifyDeletionCode);
router.post("/account-deletion/status", privacyController.getDeletionStatus);
router.post("/account-deletion/cancel", privacyController.cancelDeletionRequest);

module.exports = router;
