const authService = require("../services/auth.service");
const { asyncHandler } = require("../middlewares/error.middleware");

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user [PUBLIC]
 *     description: Public endpoint - No authentication required. Only regular users can register (not admins).
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - consent
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               deviceId:
 *                 type: string
 *               consent:
 *                 type: object
 *                 properties:
 *                   accepted:
 *                     type: boolean
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or email already exists
 */
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      user: result.user,
      token: result.token,
      expiresAt: result.expiresAt,
    },
  });
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user or admin [PUBLIC]
 *     description: Public endpoint - No authentication required. Login with email and password for both users and admins.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               deviceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);

  res.json({
    success: true,
    message: "Login successful",
    data: {
      user: result.user,
      token: result.token,
      expiresAt: result.expiresAt,
    },
  });
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user (revoke token) [USER]
 *     description: Requires user authentication. Logout and revoke the current JWT token.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 */
const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.userId, req.jti, req.body.deviceId);

  res.json({
    success: true,
    message: "Logged out successfully",
    data: null,
  });
});

/**
 * @swagger
 * /auth/password-reset-request:
 *   post:
 *     summary: Request password reset [PUBLIC]
 *     description: Public endpoint - No authentication required. Request a password reset email.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset email sent if user exists
 */
const passwordResetRequest = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);

  res.json({
    success: true,
    message: "If the email exists, a password reset link has been sent",
    data: null,
  });
});

/**
 * @swagger
 * /auth/password-reset:
 *   post:
 *     summary: Reset password with token [PUBLIC]
 *     description: Public endpoint - No authentication required. Reset password using reset token from email.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resetToken
 *               - newPassword
 *             properties:
 *               resetToken:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
const passwordReset = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.resetToken, req.body.newPassword);

  res.json({
    success: true,
    message: "Password reset successful",
    data: null,
  });
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile [USER/ADMIN]
 *     description: Requires authentication. Get profile of the currently logged-in user or admin.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getUserProfile(req.userId);

  res.json({
    success: true,
    message: "Profile retrieved successfully",
    data: { user },
  });
});

  /**
   * @swagger
   * /auth/me:
   *   put:
   *     summary: Update current user profile [USER/ADMIN]
   *     description: Requires authentication. Update profile of the currently logged-in user or admin. Can update email, password, name, and other profile fields.
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 example: John Doe
   *               email:
   *                 type: string
   *                 format: email
   *                 example: newemail@example.com
   *               password:
   *                 type: string
   *                 minLength: 8
   *                 example: NewSecurePassword123!
   *               phone:
   *                 type: string
   *                 example: "+1234567890"
   *               age:
   *                 type: number
   *                 example: 30
   *               diabetesType:
   *                 type: string
   *                 enum: [type1, type2, gestational, prediabetes]
   *               preferences:
   *                 type: object
   *     responses:
   *       200:
   *         description: Profile updated successfully
   *       400:
   *         description: Email already in use or validation error
   *       401:
   *         description: Unauthorized
   */
  const updateMe = asyncHandler(async (req, res) => {
    const user = await authService.updateUserProfile(req.userId, req.body);

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { user },
    });
  });

module.exports = {
  register,
  login,
  logout,
  passwordResetRequest,
  passwordReset,
  getMe,
  updateMe,
};

