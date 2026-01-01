const authService = require("../services/auth.service");
const adminService = require("../services/admin.service");
const auditService = require("../services/audit.service");
const emailService = require("../services/email.service");
const { asyncHandler } = require("../middlewares/error.middleware");
const { exec } = require("child_process");
const { promisify } = require("util");
const path = require("path");
const config = require("../config");

const execAsync = promisify(exec);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only operations (requires admin role)
 */

/**
 * @swagger
 * /admin/seed-initial:
 *   post:
 *     summary: Run initial seed script [ADMIN ONLY]
 *     description: Requires admin role. Run the database seeding script to populate initial data.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seed script executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 output:
 *                   type: string
 *       500:
 *         description: Seed script execution failed
 */
const runInitialSeed = asyncHandler(async (req, res) => {
  const seedPath = path.join(__dirname, "../../seeds/seedInitial.js");

  try {
    const { stdout, stderr } = await execAsync(`node "${seedPath}"`);

    await auditService.logAudit({
      action: "seed_initial_executed",
      who: req.user._id,
      payload: { output: stdout },
    });

    res.json({
      success: true,
      message: "Seed script executed successfully",
      output: stdout || stderr,
    });
  } catch (error) {
    await auditService.logAudit({
      action: "seed_initial_failed",
      who: req.user._id,
      payload: { error: error.message },
    });

    throw error;
  }
});

/**
 * @swagger
 * /admin/revoke-user-tokens:
 *   post:
 *     summary: Revoke all tokens for a specific user [ADMIN ONLY]
 *     description: Requires admin role. Revoke all JWT tokens for a specific user (force logout).
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID whose tokens should be revoked
 *     responses:
 *       200:
 *         description: User tokens revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid userId
 */
const revokeUserTokens = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "userId is required",
    });
  }

  await authService.revokeAllUserTokens(userId);

  await auditService.logAudit({
    action: "revoke_user_tokens",
    who: req.user._id,
    target: {
      collection: "User",
      id: userId,
    },
    payload: { revokedBy: req.user.email },
  });

  res.json({
    success: true,
    message: `All tokens revoked for user ${userId}`,
  });
});

/**
 * @swagger
 * /admin/audit:
 *   get:
 *     summary: Get audit logs with pagination [ADMIN ONLY]
 *     description: Requires admin role. Retrieve audit logs with optional filtering by action or user.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *     responses:
 *       200:
 *         description: Audit logs retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Audit'
 *                 pagination:
 *                   type: object
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, userId } = req.query;

  const filters = {};
  if (action) filters.action = action;
  if (userId) filters.userId = userId;

  const result = await auditService.getAuditLogs(
    filters,
    Number(page),
    Number(limit)
  );

  res.json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

/**
 * @swagger
 * /admin/admins:
 *   post:
 *     summary: Create a new admin user [ADMIN ONLY]
 *     description: Requires admin authentication. Allows existing admins to create new admin accounts.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@gluvia.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass123!
 *               name:
 *                 type: string
 *                 example: John Admin
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       201:
 *         description: Admin created successfully
 *       403:
 *         description: Forbidden - Admin role required
 */
const createAdmin = asyncHandler(async (req, res) => {
  const admin = await authService.createAdmin(req.body);

  // Generate password reset token for the new admin
  const resetToken = await adminService.generateAdminPasswordReset(
    admin._id.toString()
  );

  // Construct password reset URL
  const resetUrl = `${config.frontendUrl || "http://localhost:3000"}/auth/reset-password?token=${resetToken}`;

  // Send email to the new admin
  try {
    await emailService.sendAdminCreatedEmail(
      admin.email,
      admin.name || "Admin",
      admin.email,
      req.user.email,
      resetUrl
    );
  } catch (error) {
    console.error("Failed to send admin creation email:", error.message);
    // Don't fail the request if email fails
  }

  await auditService.logAudit({
    action: "admin_created",
    who: req.user._id,
    target: {
      collection: "User",
      id: admin._id,
    },
    payload: { email: admin.email, createdBy: req.user.email },
  });

  res.status(201).json({
    success: true,
    message: "Admin user created successfully. Password reset email sent.",
    data: { admin, resetToken },
  });
});

/**
 * @swagger
 * /admin/admins:
 *   get:
 *     summary: List all admin users [ADMIN ONLY]
 *     description: Requires admin authentication. Get a list of all admin users in the system.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of admins retrieved successfully
 */
const listAdmins = asyncHandler(async (req, res) => {
  const admins = await adminService.getAllAdmins();

  res.json({
    success: true,
    message: "Admins retrieved successfully",
    data: {
      admins,
      total: admins.length,
    },
  });
});

/**
 * @swagger
 * /admin/admins/{adminId}:
 *   get:
 *     summary: Get admin details by ID [ADMIN ONLY]
 *     description: Requires admin authentication. Get detailed information about a specific admin user.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin details retrieved successfully
 *       404:
 *         description: Admin not found
 */
const getAdminById = asyncHandler(async (req, res) => {
  const admin = await adminService.getAdminById(req.params.adminId);

  res.json({
    success: true,
    message: "Admin details retrieved successfully",
    data: { admin },
  });
});

/**
 * @swagger
 * /admin/admins/{adminId}:
 *   put:
 *     summary: Update admin details [ADMIN ONLY]
 *     description: Requires admin authentication. Update information of an existing admin user.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin updated successfully
 *       404:
 *         description: Admin not found
 */
const updateAdmin = asyncHandler(async (req, res) => {
  const admin = await adminService.updateAdmin(req.params.adminId, req.body);

  await auditService.logAudit({
    action: "admin_updated",
    who: req.user._id,
    target: {
      collection: "User",
      id: req.params.adminId,
    },
    payload: { updates: req.body, updatedBy: req.user.email },
  });

  res.json({
    success: true,
    message: "Admin updated successfully",
    data: { admin },
  });
});

/**
 * @swagger
 * /admin/admins/{adminId}/deactivate:
 *   post:
 *     summary: Deactivate an admin user [ADMIN ONLY]
 *     description: Requires admin authentication. Soft-delete an admin user. Cannot deactivate yourself.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin deactivated successfully
 *       400:
 *         description: Cannot deactivate yourself
 *       404:
 *         description: Admin not found
 */
const deactivateAdmin = asyncHandler(async (req, res) => {
  // Prevent self-deactivation
  if (req.params.adminId === req.userId) {
    return res.status(400).json({
      success: false,
      message: "Cannot deactivate your own account",
      data: null,
    });
  }

  await adminService.deactivateAdmin(req.params.adminId);

  await auditService.logAudit({
    action: "admin_deactivated",
    who: req.user._id,
    target: {
      collection: "User",
      id: req.params.adminId,
    },
    payload: { deactivatedBy: req.user.email },
  });

  res.json({
    success: true,
    message: "Admin deactivated successfully",
    data: null,
  });
});

/**
 * @swagger
 * /admin/admins/{adminId}/activate:
 *   post:
 *     summary: Reactivate a deactivated admin user [ADMIN ONLY]
 *     description: Requires admin authentication. Restore a previously deactivated admin user.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin reactivated successfully
 *       404:
 *         description: Admin not found
 */
const activateAdmin = asyncHandler(async (req, res) => {
  await adminService.activateAdmin(req.params.adminId);

  await auditService.logAudit({
    action: "admin_activated",
    who: req.user._id,
    target: {
      collection: "User",
      id: req.params.adminId,
    },
    payload: { activatedBy: req.user.email },
  });

  res.json({
    success: true,
    message: "Admin reactivated successfully",
    data: null,
  });
});

/**
 * @swagger
 * /admin/admins/{adminId}/reset-password:
 *   post:
 *     summary: Generate password reset token for an admin [ADMIN ONLY]
 *     description: Requires admin authentication. Generate a password reset token for another admin and send reset email.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Password reset initiated and email sent
 */
const resetAdminPassword = asyncHandler(async (req, res) => {
  const { admin, resetToken } = await adminService.generateAdminPasswordReset(
    req.params.adminId
  );

  // Create reset URL
  const resetUrl = `${config.frontendUrl || "http://localhost:3000"}/auth/reset-password?token=${resetToken}`;

  // Send password reset email
  try {
    await emailService.sendPasswordResetEmail(
      admin.email,
      admin.name || admin.email.split("@")[0],
      resetUrl
    );
  } catch (emailError) {
    console.error("Failed to send password reset email:", emailError);
    // Continue even if email fails
  }

  await auditService.logAudit({
    action: "admin_password_reset_initiated",
    who: req.user._id,
    target: {
      collection: "User",
      id: req.params.adminId,
    },
    payload: { initiatedBy: req.user.email, emailSent: true },
  });

  res.json({
    success: true,
    message: "Password reset email sent to admin.",
    data: { resetToken },
  });
});

/**
 * @swagger
 * /admin/admins/stats:
 *   get:
 *     summary: Get admin statistics [ADMIN ONLY]
 *     description: Requires admin authentication. Get statistics about admin users in the system.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin statistics retrieved successfully
 */
const getAdminStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getAdminStats();

  res.json({
    success: true,
    message: "Admin statistics retrieved successfully",
    data: { stats },
  });
});

// ==========================================
// USER MANAGEMENT ENDPOINTS
// ==========================================

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List all users [ADMIN ONLY]
 *     description: Requires admin authentication. Get a list of all regular users (non-admin) in the system.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 */
const fetchAllUsers = asyncHandler(async (req, res) => {
  const users = await adminService.getAllUsers();

  res.json({
    success: true,
    message: "Users retrieved successfully",
    data: {
      users,
      total: users.length,
    },
  });
});

/**
 * @swagger
 * /admin/users/{userId}:
 *   get:
 *     summary: Get user details by ID [ADMIN ONLY]
 *     description: Requires admin authentication. Get detailed information about a specific user.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       404:
 *         description: User not found
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await adminService.getUserById(req.params.userId);

  res.json({
    success: true,
    message: "User details retrieved successfully",
    data: { user },
  });
});

/**
 * @swagger
 * /admin/users:
 *   post:
 *     summary: Create a new user [ADMIN ONLY]
 *     description: Requires admin authentication. Allows admins to create new user accounts.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass123!
 *               name:
 *                 type: string
 *                 example: John Doe
 *               phone:
 *                 type: string
 *                 example: "+2348012345678"
 *               role:
 *                 type: string
 *                 enum: [user, health_worker]
 *                 default: user
 *     responses:
 *       201:
 *         description: User created successfully
 *       403:
 *         description: Forbidden - Admin role required
 */
const createUser = asyncHandler(async (req, res) => {
  // Ensure role is not admin (only createAdmin should create admins)
  const userData = { ...req.body };
  if (userData.role === "admin") {
    return res.status(400).json({
      success: false,
      message: "Use /admin/admins endpoint to create admin users",
      data: null,
    });
  }

  const user = await authService.register(userData);

  await auditService.logAudit({
    action: "user_created_by_admin",
    who: req.user._id,
    target: {
      collection: "User",
      id: user._id,
    },
    payload: { email: user.email, createdBy: req.user.email },
  });

  res.status(201).json({
    success: true,
    message: "User created successfully",
    data: { user },
  });
});

/**
 * @swagger
 * /admin/users/{userId}:
 *   put:
 *     summary: Update user details [ADMIN ONLY]
 *     description: Requires admin authentication. Update information of an existing user.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, health_worker]
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 */
const updateUser = asyncHandler(async (req, res) => {
  const user = await adminService.updateUser(req.params.userId, req.body);

  await auditService.logAudit({
    action: "user_updated_by_admin",
    who: req.user._id,
    target: {
      collection: "User",
      id: req.params.userId,
    },
    payload: { updates: req.body, updatedBy: req.user.email },
  });

  res.json({
    success: true,
    message: "User updated successfully",
    data: { user },
  });
});

/**
 * @swagger
 * /admin/users/{userId}/deactivate:
 *   post:
 *     summary: Deactivate a user [ADMIN ONLY]
 *     description: Requires admin authentication. Soft-delete a user account.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *       404:
 *         description: User not found
 */
const deactivateUser = asyncHandler(async (req, res) => {
  await adminService.deactivateUser(req.params.userId);

  await auditService.logAudit({
    action: "user_deactivated",
    who: req.user._id,
    target: {
      collection: "User",
      id: req.params.userId,
    },
    payload: { deactivatedBy: req.user.email },
  });

  res.json({
    success: true,
    message: "User deactivated successfully",
    data: null,
  });
});

/**
 * @swagger
 * /admin/users/{userId}/activate:
 *   post:
 *     summary: Reactivate a deactivated user [ADMIN ONLY]
 *     description: Requires admin authentication. Restore a previously deactivated user.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User reactivated successfully
 *       404:
 *         description: User not found
 */
const activateUser = asyncHandler(async (req, res) => {
  await adminService.activateUser(req.params.userId);

  await auditService.logAudit({
    action: "user_activated",
    who: req.user._id,
    target: {
      collection: "User",
      id: req.params.userId,
    },
    payload: { activatedBy: req.user.email },
  });

  res.json({
    success: true,
    message: "User reactivated successfully",
    data: null,
  });
});

/**
 * @swagger
 * /admin/users/{userId}/reset-password:
 *   post:
 *     summary: Generate password reset token for a user [ADMIN ONLY]
 *     description: Requires admin authentication. Generate a password reset token for a user and send reset email.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Password reset initiated and email sent
 */
const resetUserPassword = asyncHandler(async (req, res) => {
  const { user, resetToken } = await adminService.generateUserPasswordReset(
    req.params.userId
  );

  // Create reset URL
  const resetUrl = `${config.frontendUrl || "http://localhost:3000"}/auth/reset-password?token=${resetToken}`;

  // Send password reset email
  try {
    await emailService.sendPasswordResetEmail(
      user.email,
      user.name || user.email.split("@")[0],
      resetUrl
    );
  } catch (emailError) {
    console.error("Failed to send password reset email:", emailError);
    // Continue even if email fails
  }

  await auditService.logAudit({
    action: "user_password_reset_initiated",
    who: req.user._id,
    target: {
      collection: "User",
      id: req.params.userId,
    },
    payload: { initiatedBy: req.user.email, emailSent: true },
  });

  res.json({
    success: true,
    message: "Password reset email sent to user.",
    data: { resetToken },
  });
});

/**
 * @swagger
 * /admin/users/stats:
 *   get:
 *     summary: Get user statistics [ADMIN ONLY]
 *     description: Requires admin authentication. Get statistics about users in the system.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 */
const getUserStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getUserStats();

  res.json({
    success: true,
    message: "User statistics retrieved successfully",
    data: { stats },
  });
});

// ==========================================
// DASHBOARD ENDPOINTS
// ==========================================

/**
 * @swagger
 * /admin/dashboard/overview:
 *   get:
 *     summary: Get comprehensive dashboard overview [ADMIN ONLY]
 *     description: Requires admin authentication. Get overall system statistics including users, foods, activity, and recent events.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: object
 *                     foods:
 *                       type: object
 *                     activity:
 *                       type: object
 *                     recentActivity:
 *                       type: array
 */
const getDashboardOverview = asyncHandler(async (req, res) => {
  const overview = await adminService.getDashboardOverview();

  res.json({
    success: true,
    message: "Dashboard overview retrieved successfully",
    data: overview,
  });
});

/**
 * @swagger
 * /admin/dashboard/charts/user-growth:
 *   get:
 *     summary: Get user growth chart data [ADMIN ONLY]
 *     description: Requires admin authentication. Get daily user registration data for charts.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to fetch
 *     responses:
 *       200:
 *         description: User growth data retrieved successfully
 */
const getUserGrowthChart = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const chartData = await adminService.getUserGrowthChart(days);

  res.json({
    success: true,
    message: "User growth chart data retrieved successfully",
    data: chartData,
  });
});

/**
 * @swagger
 * /admin/dashboard/charts/meal-logs:
 *   get:
 *     summary: Get meal logs chart data [ADMIN ONLY]
 *     description: Requires admin authentication. Get daily meal log counts for charts.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to fetch
 *     responses:
 *       200:
 *         description: Meal logs chart data retrieved successfully
 */
const getMealLogsChart = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const chartData = await adminService.getMealLogsChart(days);

  res.json({
    success: true,
    message: "Meal logs chart data retrieved successfully",
    data: chartData,
  });
});

/**
 * @swagger
 * /admin/dashboard/charts/glucose-logs:
 *   get:
 *     summary: Get glucose logs chart data [ADMIN ONLY]
 *     description: Requires admin authentication. Get daily glucose log counts and averages for charts.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to fetch
 *     responses:
 *       200:
 *         description: Glucose logs chart data retrieved successfully
 */
const getGlucoseLogsChart = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const chartData = await adminService.getGlucoseLogsChart(days);

  res.json({
    success: true,
    message: "Glucose logs chart data retrieved successfully",
    data: chartData,
  });
});

/**
 * @swagger
 * /admin/dashboard/top-foods:
 *   get:
 *     summary: Get top foods by usage [ADMIN ONLY]
 *     description: Requires admin authentication. Get most frequently logged foods.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of top foods to return
 *     responses:
 *       200:
 *         description: Top foods retrieved successfully
 */
const getTopFoods = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const topFoods = await adminService.getTopFoods(limit);

  res.json({
    success: true,
    message: "Top foods retrieved successfully",
    data: topFoods,
  });
});

/**
 * @swagger
 * /admin/dashboard/system-health:
 *   get:
 *     summary: Get system health metrics [ADMIN ONLY]
 *     description: Requires admin authentication. Get real-time system health indicators.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health metrics retrieved successfully
 */
const getSystemHealth = asyncHandler(async (req, res) => {
  const health = await adminService.getSystemHealth();

  res.json({
    success: true,
    message: "System health retrieved successfully",
    data: health,
  });
});

/**
 * @swagger
 * /admin/dashboard/user-engagement:
 *   get:
 *     summary: Get user engagement metrics [ADMIN ONLY]
 *     description: Requires admin authentication. Get detailed user engagement and feature adoption metrics.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User engagement metrics retrieved successfully
 */
const getUserEngagement = asyncHandler(async (req, res) => {
  const engagement = await adminService.getUserEngagement();

  res.json({
    success: true,
    message: "User engagement metrics retrieved successfully",
    data: engagement,
  });
});

/**
 * @swagger
 * /admin/dashboard/recent-users:
 *   get:
 *     summary: Get recent user registrations [ADMIN ONLY]
 *     description: Requires admin authentication. Get list of recently registered users.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of recent users to return
 *     responses:
 *       200:
 *         description: Recent users retrieved successfully
 */
const getRecentUsers = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const users = await adminService.getRecentUsers(limit);

  res.json({
    success: true,
    message: "Recent users retrieved successfully",
    data: users,
  });
});

/**
 * @swagger
 * /admin/dashboard/activity-heatmap:
 *   get:
 *     summary: Get activity heatmap data [ADMIN ONLY]
 *     description: Requires admin authentication. Get hourly activity distribution for heatmap visualization.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days to analyze
 *     responses:
 *       200:
 *         description: Activity heatmap data retrieved successfully
 */
const getActivityHeatmap = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const heatmap = await adminService.getActivityHeatmap(days);

  res.json({
    success: true,
    message: "Activity heatmap data retrieved successfully",
    data: heatmap,
  });
});

module.exports = {
  runInitialSeed,
  revokeUserTokens,
  getAuditLogs,
  createAdmin,
  listAdmins,
  getAdminById,
  updateAdmin,
  deactivateAdmin,
  activateAdmin,
  resetAdminPassword,
  getAdminStats,
  fetchAllUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  resetUserPassword,
  getUserStats,
  getDashboardOverview,
  getUserGrowthChart,
  getMealLogsChart,
  getGlucoseLogsChart,
  getTopFoods,
  getSystemHealth,
  getUserEngagement,
  getRecentUsers,
  getActivityHeatmap,
};
