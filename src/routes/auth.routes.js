const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { validate } = require("../middlewares/validate.middleware");
const { authenticate } = require("../middlewares/auth.middleware");
const { authLimiter } = require("../middlewares/rateLimit.middleware");
const {
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
} = require("../utils/validators");

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  authController.register
);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/logout", authenticate, authController.logout);
router.post(
  "/password-reset-request",
  authLimiter,
  validate(passwordResetRequestSchema),
  authController.passwordResetRequest
);
router.post(
  "/password-reset",
  authLimiter,
  validate(passwordResetSchema),
  authController.passwordReset
);

// Profile management routes
router.get("/me", authenticate, authController.getMe);
router.put("/me", authenticate, authController.updateMe);

module.exports = router;
