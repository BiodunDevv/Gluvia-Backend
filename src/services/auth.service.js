const User = require("../models/user.model");
const RevokedToken = require("../models/revokedToken.model");
const {
  hashPassword,
  comparePassword,
  generateRandomToken,
} = require("../utils/hash.util");
const { generateToken } = require("../utils/jwt.util");
const emailService = require("./email.service");
const notificationService = require("./notification.service");
const config = require("../config");
const { t } = require("../utils/i18n.util");
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Register a new user (only for regular users, not admins)
 */
const register = async ({
  email,
  password,
  name,
  phone,
  deviceId,
  consent,
  language,
}) => {
  // Check if user already exists
  const existingUser = await User.findOne({ email }).select("_id").lean();
  if (existingUser) {
    throw new Error(t("auth_email_registered", "english"));
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user with 'user' role only (admins cannot self-register)
  const userObj = {
    email,
    passwordHash,
    name,
    phone,
    role: "user", // Force user role for public registration
    consent,
  };

  const user = await User.create(userObj);

  // Generate token
  const { token, jti, expiresAt } = generateToken({
    sub: user._id.toString(),
    role: user.role,
  });

  user.lastLoginAt = new Date();
  await user.save();

  // Send welcome email
  try {
    await emailService.sendWelcomeEmail(user.email, user.name || "User");
  } catch (error) {
    console.error("Failed to send welcome email:", error.message);
  }

  await notificationService
    .createNotification({
      userId: user._id,
      type: "system",
      title: "Welcome to Gluvia AI",
      body: "Your account is ready. Complete your profile and sync foods to start getting meal guidance.",
      data: { route: "/(tabs)/profile" },
      dedupeKey: notificationService.buildDedupeKey(
        "welcome",
        user._id.toString()
      ),
    })
    .catch(() => {});

  return {
    user,
    token,
    expiresAt,
  };
};

/**
 * Login user
 */
const login = async ({ email, password, deviceId, language }) => {
  // Find user
  const user = await User.findOne({ email, deleted: false }).select(
    "email passwordHash role name phone profile consent lastLoginAt deleted createdAt updatedAt"
  );
  if (!user) {
    const error = new Error(t("auth_account_not_found", "english"));
    error.code = "ACCOUNT_NOT_FOUND";
    throw error;
  }

  // Compare password
  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    const error = new Error(t("auth_invalid_password", "english"));
    error.code = "INVALID_PASSWORD";
    throw error;
  }

  // Generate token
  const { token, jti, expiresAt } = generateToken({
    sub: user._id.toString(),
    role: user.role,
  });

  user.lastLoginAt = new Date();
  await user.save();

  return {
    user,
    token,
    expiresAt,
  };
};

/**
 * Logout user (revoke token)
 */
const logout = async (userId, jti, deviceId) => {
  const user = await User.findById(userId).select("_id");
  if (!user) {
    throw new Error(t("auth_user_not_found", "english"));
  }

  await RevokedToken.create({
    jti,
    userId,
    expiresAt: new Date(Date.now() + THIRTY_DAYS_MS),
    reason: "logout",
  });

  return { ok: true };
};

/**
 * Request password reset
 */
const requestPasswordReset = async (email) => {
  const user = await User.findOne({ email, deleted: false }).select(
    "_id email name role profile passwordResetToken passwordResetExpires deleted"
  );
  if (!user) {
    // Don't reveal if email exists
    return { ok: true };
  }

  // Generate reset token
  const resetToken = generateRandomToken(32);
  const hashedToken = await hashPassword(resetToken);

  // Save to user
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  // Send email
  const resetUrl = `${config.frontendUrl}/auth/reset-password?token=${resetToken}`;
  try {
    await emailService.sendPasswordResetEmail(
      user.email,
      user.name || "User",
      resetUrl
    );
  } catch (error) {
    console.error("Failed to send password reset email:", error.message);
    throw new Error(t("auth_reset_email_failed", "english"));
  }

  if (user.role === "user") {
    await notificationService
      .createNotification({
        userId: user._id,
        type: "system",
        title: "Password reset requested",
        body: "A password reset request was started for your account. If this was not you, secure your email and account immediately.",
        data: { route: "/notifications" },
        dedupeKey: notificationService.buildDedupeKey(
          "password_reset_requested",
          user._id.toString(),
          new Date().toISOString().slice(0, 13)
        ),
      })
      .catch(() => {});
  }

  return { ok: true };
};

/**
 * Reset password
 */
const resetPassword = async (resetToken, newPassword) => {
  // Find users with non-expired reset tokens
  const users = await User.find({
    passwordResetToken: { $exists: true },
    passwordResetExpires: { $gt: new Date() },
    deleted: false,
  });

  let user = null;
  for (const u of users) {
    const isValid = await comparePassword(resetToken, u.passwordResetToken);
    if (isValid) {
      user = u;
      break;
    }
  }

  if (!user) {
    throw new Error(t("auth_reset_token_invalid", "english"));
  }

  // Update password
  user.passwordHash = await hashPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Revoke all active tokens for this user
  await revokeAllUserTokens(user._id);

  if (user.role === "user") {
    await notificationService
      .createNotification({
        userId: user._id,
        type: "system",
        title: "Password updated",
        body: "Your account password was changed successfully.",
        data: { route: "/notifications" },
        dedupeKey: notificationService.buildDedupeKey(
          "password_updated",
          user._id.toString(),
          new Date().toISOString().slice(0, 13)
        ),
      })
      .catch(() => {});
  }

  return { ok: true };
};

/**
 * Check if token is revoked
 */
const isTokenRevoked = async (jti, userId, tokenIssuedAtMs) => {
  const exactRevocation = await RevokedToken.findOne({ jti }).select("_id").lean();
  if (exactRevocation) {
    return true;
  }

  if (!userId) {
    return false;
  }

  const globalRevocation = await RevokedToken.findOne({
    jti: `user_${userId}_all`,
  })
    .sort({ createdAt: -1 })
    .select("createdAt")
    .lean();

  if (!globalRevocation) {
    return false;
  }

  const issuedAt =
    typeof tokenIssuedAtMs === "number" && Number.isFinite(tokenIssuedAtMs)
      ? tokenIssuedAtMs
      : 0;
  const revokedAt = new Date(globalRevocation.createdAt).getTime();

  return issuedAt > 0 && issuedAt <= revokedAt;
};

/**
 * Revoke all tokens for a user
 */
const revokeAllUserTokens = async (userId) => {
  const user = await User.findById(userId).select("_id");
  if (!user) {
    throw new Error("User not found");
  }

  // Revoke all tokens for this user by setting a revocation timestamp
  const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);

  await RevokedToken.create({
    jti: `user_${userId}_all`,
    userId,
    expiresAt,
    reason: "admin_revoke_all",
  });

  return { ok: true };
};

/**
 * Get user profile by ID
 */
const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select("-passwordHash -__v");
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};

/**
 * Update user profile
 */
const updateUserProfile = async (userId, updateData) => {
  const allowedUpdates = [
    "name",
    "email",
    "password",
    "phone",
    "profile", // Allow updating the profile object
  ];
  const updates = {};

  // Filter allowed updates
  Object.keys(updateData).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      updates[key] = updateData[key];
    }
  });

  // Handle nested profile updates
  if (updates.profile && typeof updates.profile === "object") {
    // If profile is being updated, merge with existing profile
    const user = await User.findById(userId).select("profile");
    if (!user) {
      throw new Error("User not found");
    }

    // Merge profile fields
    updates.profile = {
      ...user.profile,
      ...updates.profile,
    };

    // Calculate BMI if height and weight are provided
    if (updates.profile.heightCm && updates.profile.weightKg) {
      const heightM = updates.profile.heightCm / 100;
      updates.profile.bmi = parseFloat(
        (updates.profile.weightKg / (heightM * heightM)).toFixed(2)
      );
    }
  }

  // Check if email is being updated and validate uniqueness
  if (updates.email) {
    const existingUser = await User.findOne({
      email: updates.email,
      _id: { $ne: userId },
    }).select("_id").lean();
    if (existingUser) {
      throw new Error("Email already in use");
    }
  }

  // Hash password if being updated
  if (updates.password) {
    updates.passwordHash = await hashPassword(updates.password);
    delete updates.password; // Remove plain password from updates
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true }
  ).select("-passwordHash");

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

/**
 * Create admin user (admin only)
 */
const createAdmin = async ({ email, password, name, phone }) => {
  // Check if user already exists
  const existingUser = await User.findOne({ email }).select("_id").lean();
  if (existingUser) {
    throw new Error("Email already registered");
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create admin user
  const user = await User.create({
    email,
    passwordHash,
    name,
    phone,
    role: "admin",
    consent: { accepted: true, timestamp: new Date() },
    profile: {
      language: "english",
    },
  });

  return user;
};

const createUser = async ({ email, password, name, phone, role = "user" }) => {
  const existingUser = await User.findOne({ email }).select("_id").lean();
  if (existingUser) {
    throw new Error("Email already registered");
  }

  const passwordHash = await hashPassword(password);

  const normalizedRole = role === "admin" ? "admin" : "user";

  return User.create({
    email,
    passwordHash,
    name,
    phone,
    role: normalizedRole,
    consent: { accepted: true, timestamp: new Date() },
    profile: {
      language: "english",
    },
  });
};

module.exports = {
  register,
  login,
  logout,
  requestPasswordReset,
  resetPassword,
  isTokenRevoked,
  revokeAllUserTokens,
  getUserProfile,
  updateUserProfile,
  createAdmin,
  createUser,
};
