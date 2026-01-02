const authService = require("../services/auth.service");
const userService = require("../services/user.service");
const { asyncHandler } = require("../middlewares/error.middleware");

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user [PUBLIC]
 *     description: Public endpoint - No authentication required. Register a new user account with email and password. Only regular users can register through this endpoint (admins are created separately).
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
 *                 description: User's email address (must be unique)
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Password (minimum 8 characters, should contain letters and numbers)
 *                 example: SecurePassword123!
 *               name:
 *                 type: string
 *                 description: User's full name
 *                 example: John Doe
 *               phone:
 *                 type: string
 *                 description: User's phone number
 *                 example: "+1234567890"
 *               deviceId:
 *                 type: string
 *                 description: Unique device identifier for mobile apps
 *                 example: expo-device-abc123
 *               consent:
 *                 type: object
 *                 required:
 *                   - accepted
 *                 properties:
 *                   accepted:
 *                     type: boolean
 *                     description: User must accept terms and conditions
 *                     example: true
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     description: When consent was given
 *                     example: "2026-01-02T00:00:00.000Z"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "6955bfa89175f23405b49eff"
 *                         email:
 *                           type: string
 *                           example: user@example.com
 *                         name:
 *                           type: string
 *                           example: John Doe
 *                         role:
 *                           type: string
 *                           example: user
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                     token:
 *                       type: string
 *                       description: JWT authentication token
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       description: Token expiration timestamp
 *                       example: "2026-02-01T00:00:00.000Z"
 *       400:
 *         description: Validation error or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Email already exists
 *       500:
 *         description: Server error
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
 *     description: Public endpoint - No authentication required. Login with email and password for both users and admins. Returns user profile with role information and JWT token.
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
 *                 format: email
 *                 description: User's email address
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 description: User's password
 *                 example: SecurePassword123!
 *               deviceId:
 *                 type: string
 *                 description: Unique device identifier for mobile apps (optional)
 *                 example: expo-device-abc123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "6955bfa89175f23405b49eff"
 *                         email:
 *                           type: string
 *                           example: user@example.com
 *                         name:
 *                           type: string
 *                           example: John Doe
 *                         role:
 *                           type: string
 *                           enum: [user, admin]
 *                           example: user
 *                           description: User role - 'user' for regular users, 'admin' for administrators
 *                         phone:
 *                           type: string
 *                           example: "+1234567890"
 *                         age:
 *                           type: number
 *                           example: 30
 *                         diabetesType:
 *                           type: string
 *                           enum: [type1, type2, gestational, prediabetes]
 *                           example: type2
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2026-01-01T00:00:00.000Z"
 *                         lastLoginAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2026-01-02T00:00:00.000Z"
 *                     token:
 *                       type: string
 *                       description: JWT authentication token (include in Authorization header as 'Bearer <token>')
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       description: Token expiration timestamp (30 days from login)
 *                       example: "2026-02-01T00:00:00.000Z"
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid credentials
 *       500:
 *         description: Server error
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
 *     description: Requires authentication. Get complete profile of the currently logged-in user or admin including all personal information, health data, and preferences.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "6955bfa89175f23405b49eff"
 *                         email:
 *                           type: string
 *                           example: user@example.com
 *                         name:
 *                           type: string
 *                           example: John Doe
 *                         phone:
 *                           type: string
 *                           example: "+1234567890"
 *                         role:
 *                           type: string
 *                           enum: [user, admin, health_worker]
 *                           example: user
 *                         profile:
 *                           type: object
 *                           properties:
 *                             age:
 *                               type: number
 *                               example: 30
 *                               description: User's age in years
 *                             sex:
 *                               type: string
 *                               enum: [male, female, other]
 *                               example: male
 *                               description: User's biological sex
 *                             heightCm:
 *                               type: number
 *                               example: 175
 *                               description: Height in centimeters
 *                             weightKg:
 *                               type: number
 *                               example: 70
 *                               description: Weight in kilograms
 *                             bmi:
 *                               type: number
 *                               example: 22.86
 *                               description: Body Mass Index (auto-calculated)
 *                             diabetesType:
 *                               type: string
 *                               enum: [type1, type2, prediabetes, unknown]
 *                               example: type2
 *                               description: Type of diabetes
 *                             activityLevel:
 *                               type: string
 *                               enum: [low, moderate, high]
 *                               example: moderate
 *                               description: Physical activity level
 *                             allergies:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               example: ["peanuts", "shellfish"]
 *                               description: List of food allergies
 *                             incomeBracket:
 *                               type: string
 *                               enum: [low, middle, high]
 *                               example: middle
 *                               description: Income level for affordability
 *                             language:
 *                               type: string
 *                               example: en
 *                               description: Preferred language code
 *                             profileImage:
 *                               type: object
 *                               properties:
 *                                 public_id:
 *                                   type: string
 *                                   example: gluvia/users/abc123
 *                                 secure_url:
 *                                   type: string
 *                                   example: https://res.cloudinary.com/df4f0usnh/image/upload/v1234567890/gluvia/users/abc123.jpg
 *                         consent:
 *                           type: object
 *                           properties:
 *                             accepted:
 *                               type: boolean
 *                               example: true
 *                             timestamp:
 *                               type: string
 *                               format: date-time
 *                               example: "2026-01-01T00:00:00.000Z"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2026-01-01T00:00:00.000Z"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2026-01-02T00:00:00.000Z"
 *                         deleted:
 *                           type: boolean
 *                           example: false
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Server error
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
 *     description: Requires authentication. Update profile of the currently logged-in user or admin. Can update email, password, name, phone, and profile fields (age, sex, height, weight, diabetes type, activity level, allergies, etc.).
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
 *                 description: User's full name
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address (must be unique)
 *                 example: newemail@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: New password (minimum 8 characters)
 *                 example: NewSecurePassword123!
 *               phone:
 *                 type: string
 *                 description: User's phone number
 *                 example: "+1234567890"
 *               profile:
 *                 type: object
 *                 description: User profile information
 *                 properties:
 *                   age:
 *                     type: number
 *                     description: User's age in years
 *                     example: 30
 *                   sex:
 *                     type: string
 *                     enum: [male, female, other]
 *                     description: User's biological sex
 *                     example: male
 *                   heightCm:
 *                     type: number
 *                     description: Height in centimeters
 *                     example: 175
 *                   weightKg:
 *                     type: number
 *                     description: Weight in kilograms
 *                     example: 70
 *                   diabetesType:
 *                     type: string
 *                     enum: [type1, type2, prediabetes, unknown]
 *                     description: Type of diabetes
 *                     example: type2
 *                   activityLevel:
 *                     type: string
 *                     enum: [low, moderate, high]
 *                     description: Physical activity level
 *                     example: moderate
 *                   allergies:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: List of food allergies
 *                     example: ["peanuts", "shellfish"]
 *                   incomeBracket:
 *                     type: string
 *                     enum: [low, middle, high]
 *                     description: Income level for affordability recommendations
 *                     example: middle
 *                   language:
 *                     type: string
 *                     description: Preferred language code
 *                     example: en
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         role:
 *                           type: string
 *                         profile:
 *                           type: object
 *                           properties:
 *                             age:
 *                               type: number
 *                             sex:
 *                               type: string
 *                             heightCm:
 *                               type: number
 *                             weightKg:
 *                               type: number
 *                             bmi:
 *                               type: number
 *                               description: Auto-calculated from height and weight
 *                             diabetesType:
 *                               type: string
 *                             activityLevel:
 *                               type: string
 *                             allergies:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             incomeBracket:
 *                               type: string
 *                             language:
 *                               type: string
 *       400:
 *         description: Email already in use or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Email already exists
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 */
const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateUserProfile(req.userId, req.body);

  res.json({
    success: true,
    message: "Profile updated successfully",
    data: { user },
  });
});

/**
 * @swagger
 * /auth/upload-photo:
 *   post:
 *     summary: Upload profile photo [USER/ADMIN]
 *     description: Requires authentication. Upload a profile photo to Cloudinary. The image will be stored in your profile and can be accessed via the profileImage field.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Profile photo (JPEG, PNG, max 5MB)
 *     responses:
 *       200:
 *         description: Photo uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile photo uploaded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     profileImage:
 *                       type: object
 *                       properties:
 *                         public_id:
 *                           type: string
 *                           example: gluvia/users/abc123
 *                         secure_url:
 *                           type: string
 *                           example: https://res.cloudinary.com/df4f0usnh/image/upload/v1234567890/gluvia/users/abc123.jpg
 *       400:
 *         description: No image file provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: No image file provided
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No image file provided",
    });
  }

  const result = await userService.uploadProfilePhoto(
    req.userId,
    req.file.buffer
  );

  res.json({
    success: true,
    message: "Profile photo uploaded successfully",
    data: result,
  });
});

/**
 * @swagger
 * /auth/delete-account:
 *   delete:
 *     summary: Delete user account [USER/ADMIN]
 *     description: Requires authentication. Permanently delete your account and all associated data (meals, glucose logs, etc.). This action cannot be undone.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Account deleted successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const deleteAccount = asyncHandler(async (req, res) => {
  await userService.deleteUserAccount(req.userId);

  res.json({
    success: true,
    message: "Account deleted successfully",
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
  uploadPhoto,
  deleteAccount,
};
