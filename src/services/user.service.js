const User = require('../models/user.model');
const cloudinaryService = require('./cloudinary.service');

/**
 * Get user profile
 */
const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select("-passwordHash -__v");
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

/**
 * Update user profile
 */
const updateUserProfile = async (userId, updates) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Update basic fields
  if (updates.name) user.name = updates.name;
  if (updates.phone) user.phone = updates.phone;

  // Update profile fields
  if (updates.profile) {
    if (!user.profile) user.profile = {};
    Object.assign(user.profile, updates.profile);

    // Recalculate BMI if height or weight changed
    if (updates.profile.heightCm || updates.profile.weightKg) {
      user.calculateBMI();
    }
  }

  await user.save();
  return user;
};

/**
 * Upload user profile photo
 */
const uploadProfilePhoto = async (userId, fileBuffer) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Delete old image if exists
  if (user.profile?.profileImage?.public_id) {
    try {
      await cloudinaryService.deleteImage(user.profile.profileImage.public_id);
    } catch (error) {
      console.error('Error deleting old profile image:', error.message);
    }
  }

  // Upload new image
  const result = await cloudinaryService.uploadFromBuffer(fileBuffer, 'gluvia/profiles');

  // Save to user
  if (!user.profile) user.profile = {};
  user.profile.profileImage = {
    public_id: result.public_id,
    secure_url: result.secure_url,
  };

  await user.save();

  return result;
};

/**
 * Export user data (NDPR compliance)
 */
const exportUserData = async (userId) => {
  const MealLog = require('../models/mealLog.model');
  const GlucoseLog = require('../models/glucoseLog.model');
  const SyncCheckpoint = require('../models/syncCheckpoint.model');
  const [user, mealLogs, glucoseLogs, syncCheckpoint] = await Promise.all([
    User.findById(userId).select("-passwordHash -__v").lean(),
    MealLog.find({ userId }).lean(),
    GlucoseLog.find({ userId }).lean(),
    SyncCheckpoint.findOne({ userId }).lean(),
  ]);

  if (!user) {
    throw new Error('User not found');
  }

  return {
    user,
    mealLogs,
    glucoseLogs,
    syncCheckpoint,
    exportedAt: new Date(),
  };
};

/**
 * Delete user account (NDPR compliance)
 */
const deleteUserAccount = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Soft delete user
  user.deleted = true;
  await user.save();

  // Revoke all tokens
  const authService = require('./auth.service');
  await authService.revokeAllUserTokens(userId);

  // Optionally delete user data (meal logs, glucose logs)
  // For NDPR compliance, you might want to anonymize or delete all user data
  // const MealLog = require('../models/mealLog.model');
  // await MealLog.deleteMany({ userId });
  
  // const GlucoseLog = require('../models/glucoseLog.model');
  // await GlucoseLog.deleteMany({ userId });

  return { ok: true };
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  uploadProfilePhoto,
  exportUserData,
  deleteUserAccount,
};
