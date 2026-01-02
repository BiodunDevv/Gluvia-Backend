const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { validate } = require("../middlewares/validate.middleware");
const { authenticate } = require("../middlewares/auth.middleware");
const { authLimiter } = require("../middlewares/rateLimit.middleware");
const multer = require("multer");
const {
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
} = require("../utils/validators");

// Configure multer for image upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

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
router.post(
  "/upload-photo",
  authenticate,
  upload.single("image"),
  authController.uploadPhoto
);
router.delete("/delete-account", authenticate, authController.deleteAccount);

module.exports = router;
