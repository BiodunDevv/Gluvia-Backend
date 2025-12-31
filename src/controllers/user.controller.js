const userService = require("../services/user.service");
const { asyncHandler } = require("../middlewares/error.middleware");

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User profile management endpoints
 */

/**
 * @swagger
 * /user/me:
 *   get:
 *     summary: Get current user profile [USER]
 *     description: Requires user authentication. Get the authenticated user's profile.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getUserProfile(req.userId);
  res.json({ user });
});

/**
 * @swagger
 * /user/me:
 *   put:
 *     summary: Update user profile [USER]
 *     description: Requires user authentication. Update the authenticated user's profile.
 *     tags: [User]
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
 *               phone:
 *                 type: string
 *               profile:
 *                 type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateUserProfile(req.userId, req.body);
  res.json({ user });
});

/**
 * @swagger
 * /user/upload-photo:
 *   post:
 *     summary: Upload profile photo [USER]
 *     description: Requires user authentication. Upload a profile photo to Cloudinary.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Photo uploaded successfully
 */
const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: {
        code: "NO_FILE",
        message: "No image file provided",
      },
    });
  }

  const result = await userService.uploadProfilePhoto(
    req.userId,
    req.file.buffer
  );
  res.json(result);
});

/**
 * @swagger
 * /user/export:
 *   get:
 *     summary: Export user data (NDPR compliance) [USER]
 *     description: Requires user authentication. Export all user data for NDPR compliance.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User data exported
 */
const exportData = asyncHandler(async (req, res) => {
  const data = await userService.exportUserData(req.userId);
  res.json(data);
});

/**
 * @swagger
 * /user:
 *   delete:
 *     summary: Delete user account [USER]
 *     description: Requires user authentication. Permanently delete the user account and all associated data.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 */
const deleteAccount = asyncHandler(async (req, res) => {
  await userService.deleteUserAccount(req.userId);
  res.json({ ok: true, message: "Account deleted successfully" });
});

module.exports = {
  getProfile,
  updateProfile,
  uploadPhoto,
  exportData,
  deleteAccount,
};
