const User = require("../models/user.model");
const auditService = require("./audit.service");
const crypto = require("crypto");

/**
 * Get all admin users
 */
const getAllAdmins = async () => {
  const admins = await User.find({ role: "admin" })
    .select("-passwordHash")
    .sort({ createdAt: -1 });

  return admins;
};

/**
 * Get admin by ID
 */
const getAdminById = async (adminId) => {
  const admin = await User.findOne({ _id: adminId, role: "admin" }).select(
    "-passwordHash"
  );

  if (!admin) {
    throw new Error("Admin not found");
  }

  return admin;
};

/**
 * Update admin details
 */
const updateAdmin = async (adminId, updateData) => {
  const allowedUpdates = ["name", "phone", "email"];
  const updates = {};

  Object.keys(updateData).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      updates[key] = updateData[key];
    }
  });

  // Check if email is being updated and if it's already in use
  if (updates.email) {
    const existingUser = await User.findOne({
      email: updates.email,
      _id: { $ne: adminId },
    });
    if (existingUser) {
      throw new Error("Email already in use");
    }
  }

  const admin = await User.findOneAndUpdate(
    { _id: adminId, role: "admin" },
    { $set: updates },
    { new: true, runValidators: true }
  ).select("-passwordHash");

  if (!admin) {
    throw new Error("Admin not found");
  }

  return admin;
};

/**
 * Deactivate admin user (soft delete)
 */
const deactivateAdmin = async (adminId) => {
  const admin = await User.findOneAndUpdate(
    { _id: adminId, role: "admin" },
    { $set: { deleted: true, deletedAt: new Date() } },
    { new: true }
  );

  if (!admin) {
    throw new Error("Admin not found");
  }

  return admin;
};

/**
 * Reactivate admin user
 */
const activateAdmin = async (adminId) => {
  const admin = await User.findOneAndUpdate(
    { _id: adminId, role: "admin" },
    { $set: { deleted: false }, $unset: { deletedAt: "" } },
    { new: true }
  );

  if (!admin) {
    throw new Error("Admin not found");
  }

  return admin;
};

/**
 * Generate password reset token for admin
 */
const generateAdminPasswordReset = async (adminId) => {
  const admin = await User.findOne({ _id: adminId, role: "admin" });

  if (!admin) {
    throw new Error("Admin not found");
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

  admin.passwordResetToken = resetToken;
  admin.passwordResetExpiry = resetTokenExpiry;
  await admin.save();

  return resetToken;
};

/**
 * Get admin statistics
 */
const getAdminStats = async () => {
  const totalAdmins = await User.countDocuments({
    role: "admin",
    deleted: { $ne: true },
  });
  // Count all non-deleted admins as active
  const activeAdmins = totalAdmins;
  const deactivatedAdmins = await User.countDocuments({
    role: "admin",
    deleted: true,
  });
  // Count admins who logged in within last 30 days
  const recentlyActiveAdmins = await User.countDocuments({
    role: "admin",
    deleted: { $ne: true },
    lastLogin: {
      $exists: true,
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    total: totalAdmins,
    active: activeAdmins,
    deactivated: deactivatedAdmins,
    recentlyActive: recentlyActiveAdmins,
  };
};

/**
 * Get all regular users (non-admin)
 */
const getAllUsers = async () => {
  const users = await User.find({ role: { $ne: "admin" } })
    .select("-passwordHash")
    .sort({ createdAt: -1 });

  return users;
};

/**
 * Get user by ID (any user, not just admins)
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId).select("-passwordHash");

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

/**
 * Update user details by admin
 */
const updateUser = async (userId, updateData) => {
  const allowedUpdates = ["name", "phone", "email", "role"];
  const updates = {};

  Object.keys(updateData).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      updates[key] = updateData[key];
    }
  });

  // Check if email is being updated and if it's already in use
  if (updates.email) {
    const existingUser = await User.findOne({
      email: updates.email,
      _id: { $ne: userId },
    });
    if (existingUser) {
      throw new Error("Email already in use");
    }
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
 * Deactivate user (soft delete)
 */
const deactivateUser = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { deleted: true, deletedAt: new Date() } },
    { new: true }
  );

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

/**
 * Reactivate user
 */
const activateUser = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { deleted: false }, $unset: { deletedAt: "" } },
    { new: true }
  );

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

/**
 * Generate password reset token for user
 */
const generateUserPasswordReset = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

  user.passwordResetToken = resetToken;
  user.passwordResetExpiry = resetTokenExpiry;
  await user.save();

  return resetToken;
};

/**
 * Get user statistics
 */
const getUserStats = async () => {
  const totalUsers = await User.countDocuments({
    role: { $ne: "admin" },
    deleted: { $ne: true },
  });
  // Count all non-deleted users as active
  const activeUsers = totalUsers;
  const deactivatedUsers = await User.countDocuments({
    role: { $ne: "admin" },
    deleted: true,
  });
  const diabeticUsers = await User.countDocuments({
    role: { $ne: "admin" },
    deleted: { $ne: true },
    "profile.diabetesType": { $exists: true, $ne: null },
  });
  // Count users who logged in within last 30 days
  const recentlyActiveUsers = await User.countDocuments({
    role: { $ne: "admin" },
    deleted: { $ne: true },
    lastLogin: {
      $exists: true,
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    total: totalUsers,
    active: activeUsers,
    deactivated: deactivatedUsers,
    diabetic: diabeticUsers,
    recentlyActive: recentlyActiveUsers,
  };
};

module.exports = {
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deactivateAdmin,
  activateAdmin,
  generateAdminPasswordReset,
  getAdminStats,
  getAllUsers,
  getUserById,
  updateUser,
  deactivateUser,
  activateUser,
  generateUserPasswordReset,
  getUserStats,
};
