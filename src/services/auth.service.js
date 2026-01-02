const User = require("../models/user.model");
const RevokedToken = require("../models/revokedToken.model");
const {
  hashPassword,
  comparePassword,
  generateRandomToken,
} = require("../utils/hash.util");
const { generateToken } = require("../utils/jwt.util");
const emailService = require("./email.service");
const config = require("../config");

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
}) => {
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("Email already registered");
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

  // Send welcome email
  try {
    await emailService.sendWelcomeEmail(user.email, user.name || "User");
  } catch (error) {
    console.error("Failed to send welcome email:", error.message);
  }

  return {
    user,
    token,
    expiresAt,
  };
};

/**
 * Login user
 */
const login = async ({ email, password, deviceId }) => {
  // Find user
  const user = await User.findOne({ email, deleted: false });
  if (!user) {
    const error = new Error(
      "Account not found. Please check your email or register a new account."
    );
    error.code = "ACCOUNT_NOT_FOUND";
    throw error;
  }

  // Compare password
  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    const error = new Error(
      "Invalid password. Please check your password and try again."
    );
    error.code = "INVALID_PASSWORD";
    throw error;
  }

  // Generate token
  const { token, jti, expiresAt } = generateToken({
    sub: user._id.toString(),
    role: user.role,
  });

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
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Add jti to revoked tokens
  const decoded = require("jsonwebtoken").decode(jti);
  const expiresAt = decoded
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await RevokedToken.create({
    jti,
    userId,
    expiresAt,
    reason: "logout",
  });

  return { ok: true };
};

/**
 * Request password reset
 */
const requestPasswordReset = async (email) => {
  const user = await User.findOne({ email, deleted: false });
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
    throw new Error("Failed to send reset email");
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
    throw new Error("Invalid or expired reset token");
  }

  // Update password
  user.passwordHash = await hashPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Revoke all active tokens for this user
  await revokeAllUserTokens(user._id);

  return { ok: true };
};

/**
 * Check if token is revoked
 */
const isTokenRevoked = async (jti) => {
  const revoked = await RevokedToken.findOne({ jti });
  return !!revoked;
};

/**
 * Revoke all tokens for a user
 */
const revokeAllUserTokens = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Revoke all tokens for this user by setting a revocation timestamp
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

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
  const user = await User.findById(userId).select("-passwordHash");
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
    const user = await User.findById(userId);
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
    });
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
  const existingUser = await User.findOne({ email });
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
  });

  return user;
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
};
