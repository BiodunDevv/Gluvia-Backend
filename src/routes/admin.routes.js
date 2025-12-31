const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const {
  authenticate,
  requireAdmin,
} = require("../middlewares/auth.middleware");

// System management
router.post(
  "/seed-initial",
  authenticate,
  requireAdmin,
  adminController.runInitialSeed
);
router.post(
  "/revoke-user-tokens",
  authenticate,
  requireAdmin,
  adminController.revokeUserTokens
);
router.get("/audit", authenticate, requireAdmin, adminController.getAuditLogs);

// Admin user management
router.post("/admins", authenticate, requireAdmin, adminController.createAdmin);
router.get("/admins", authenticate, requireAdmin, adminController.listAdmins);
router.get(
  "/admins/stats",
  authenticate,
  requireAdmin,
  adminController.getAdminStats
);
router.get(
  "/admins/:adminId",
  authenticate,
  requireAdmin,
  adminController.getAdminById
);
router.put(
  "/admins/:adminId",
  authenticate,
  requireAdmin,
  adminController.updateAdmin
);
router.post(
  "/admins/:adminId/deactivate",
  authenticate,
  requireAdmin,
  adminController.deactivateAdmin
);
router.post(
  "/admins/:adminId/activate",
  authenticate,
  requireAdmin,
  adminController.activateAdmin
);
router.post(
  "/admins/:adminId/reset-password",
  authenticate,
  requireAdmin,
  adminController.resetAdminPassword
);

// Regular user management
router.get("/users", authenticate, requireAdmin, adminController.fetchAllUsers);
router.post("/users", authenticate, requireAdmin, adminController.createUser);
router.get(
  "/users/stats",
  authenticate,
  requireAdmin,
  adminController.getUserStats
);
router.get(
  "/users/:userId",
  authenticate,
  requireAdmin,
  adminController.getUserById
);
router.put(
  "/users/:userId",
  authenticate,
  requireAdmin,
  adminController.updateUser
);
router.post(
  "/users/:userId/deactivate",
  authenticate,
  requireAdmin,
  adminController.deactivateUser
);
router.post(
  "/users/:userId/activate",
  authenticate,
  requireAdmin,
  adminController.activateUser
);
router.post(
  "/users/:userId/reset-password",
  authenticate,
  requireAdmin,
  adminController.resetUserPassword
);

module.exports = router;
