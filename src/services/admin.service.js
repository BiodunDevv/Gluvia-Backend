const User = require("../models/user.model");
const FoodItem = require("../models/food.model");
const MealLog = require("../models/mealLog.model");
const GlucoseLog = require("../models/glucoseLog.model");
const Audit = require("../models/audit.model");
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

  return { admin, resetToken };
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

  return { user, resetToken };
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

/**
 * Get comprehensive dashboard overview statistics
 */
const getDashboardOverview = async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // User statistics
  const [
    totalUsers,
    activeUsers,
    newUsersLast30Days,
    newUsersLast7Days,
    totalAdmins,
  ] = await Promise.all([
    User.countDocuments({ role: { $ne: "admin" } }),
    User.countDocuments({
      role: { $ne: "admin" },
      lastLoginAt: { $gte: sevenDaysAgo },
    }),
    User.countDocuments({
      role: { $ne: "admin" },
      createdAt: { $gte: thirtyDaysAgo },
    }),
    User.countDocuments({
      role: { $ne: "admin" },
      createdAt: { $gte: sevenDaysAgo },
    }),
    User.countDocuments({ role: "admin" }),
  ]);

  // Food database statistics
  const [totalFoods, newFoodsLast30Days, foodsByCategory] = await Promise.all([
    FoodItem.countDocuments({ deleted: false }),
    FoodItem.countDocuments({
      deleted: false,
      createdAt: { $gte: thirtyDaysAgo },
    }),
    FoodItem.aggregate([
      { $match: { deleted: false } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  // Activity statistics
  const [
    totalMealLogs,
    mealLogsLast24h,
    mealLogsLast7Days,
    totalGlucoseLogs,
    glucoseLogsLast24h,
    glucoseLogsLast7Days,
  ] = await Promise.all([
    MealLog.countDocuments(),
    MealLog.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } }),
    MealLog.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    GlucoseLog.countDocuments(),
    GlucoseLog.countDocuments({ timestamp: { $gte: twentyFourHoursAgo } }),
    GlucoseLog.countDocuments({ timestamp: { $gte: sevenDaysAgo } }),
  ]);

  // Recent audit activity
  const recentAudits = await Audit.find()
    .sort({ timestamp: -1 })
    .limit(10)
    .populate("who", "name email")
    .lean();

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      newLast30Days: newUsersLast30Days,
      newLast7Days: newUsersLast7Days,
      growthRate:
        totalUsers > 0
          ? ((newUsersLast30Days / totalUsers) * 100).toFixed(2)
          : 0,
    },
    admins: {
      total: totalAdmins,
    },
    foods: {
      total: totalFoods,
      newLast30Days: newFoodsLast30Days,
      byCategory: foodsByCategory.map((cat) => ({
        category: cat._id || "Uncategorized",
        count: cat.count,
      })),
    },
    activity: {
      mealLogs: {
        total: totalMealLogs,
        last24h: mealLogsLast24h,
        last7Days: mealLogsLast7Days,
      },
      glucoseLogs: {
        total: totalGlucoseLogs,
        last24h: glucoseLogsLast24h,
        last7Days: glucoseLogsLast7Days,
      },
    },
    recentActivity: recentAudits.map((audit) => ({
      action: audit.action,
      user: audit.who ? { name: audit.who.name, email: audit.who.email } : null,
      timestamp: audit.timestamp,
      target: audit.target,
    })),
  };
};

/**
 * Get user growth chart data (last 30 days)
 */
const getUserGrowthChart = async (days = 30) => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999); // Set to end of today

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const userGrowth = await User.aggregate([
    {
      $match: {
        role: { $ne: "admin" },
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill in missing dates with 0 counts up to today
  const chartData = [];
  const currentDate = new Date(startDate);
  const todayStr = endDate.toISOString().split("T")[0];

  // Loop through all dates from start to today (inclusive)
  while (true) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const dataPoint = userGrowth.find((d) => d._id === dateStr);

    chartData.push({
      date: dateStr,
      count: dataPoint ? dataPoint.count : 0,
    });

    // Break if we've reached today
    if (dateStr === todayStr) {
      break;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return chartData;
};

/**
 * Get meal logs chart data (last 30 days)
 */
const getMealLogsChart = async (days = 30) => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999); // Set to end of today

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const mealLogs = await MealLog.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill in missing dates up to today
  const chartData = [];
  const currentDate = new Date(startDate);
  const todayStr = endDate.toISOString().split("T")[0];

  while (true) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const dataPoint = mealLogs.find((d) => d._id === dateStr);

    chartData.push({
      date: dateStr,
      count: dataPoint ? dataPoint.count : 0,
    });

    // Break if we've reached today
    if (dateStr === todayStr) {
      break;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return chartData;
};

/**
 * Get glucose logs chart data (last 30 days)
 */
const getGlucoseLogsChart = async (days = 30) => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999); // Set to end of today

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const glucoseLogs = await GlucoseLog.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
        },
        count: { $sum: 1 },
        avgGlucose: { $avg: "$glucoseLevel" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill in missing dates up to today
  const chartData = [];
  const currentDate = new Date(startDate);
  const todayStr = endDate.toISOString().split("T")[0];

  while (true) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const dataPoint = glucoseLogs.find((d) => d._id === dateStr);

    chartData.push({
      date: dateStr,
      count: dataPoint ? dataPoint.count : 0,
      avgGlucose: dataPoint ? Math.round(dataPoint.avgGlucose * 10) / 10 : null,
    });

    // Break if we've reached today
    if (dateStr === todayStr) {
      break;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return chartData;
};

/**
 * Get top foods by usage
 */
const getTopFoods = async (limit = 20) => {
  const topFoods = await MealLog.aggregate([
    { $unwind: "$foods" },
    {
      $group: {
        _id: "$foods.foodId",
        usageCount: { $sum: 1 },
      },
    },
    { $sort: { usageCount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "fooditems",
        localField: "_id",
        foreignField: "_id",
        as: "foodDetails",
      },
    },
    { $unwind: "$foodDetails" },
    {
      $project: {
        _id: 1,
        usageCount: 1,
        name: "$foodDetails.localName",
        category: "$foodDetails.category",
        imageUrl: "$foodDetails.imageUrl",
      },
    },
  ]);

  return topFoods;
};

/**
 * Get system health metrics
 */
const getSystemHealth = async () => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [recentErrors, recentLogins, failedLogins, activeUsersLastHour] =
    await Promise.all([
      Audit.countDocuments({
        action: { $regex: /error|failed/i },
        timestamp: { $gte: oneHourAgo },
      }),
      Audit.countDocuments({
        action: "login",
        timestamp: { $gte: oneHourAgo },
      }),
      Audit.countDocuments({
        action: "login_failed",
        timestamp: { $gte: oneHourAgo },
      }),
      User.countDocuments({
        lastLoginAt: { $gte: oneHourAgo },
      }),
    ]);

  return {
    status: recentErrors > 10 ? "warning" : "healthy",
    metrics: {
      recentErrors,
      recentLogins,
      failedLogins,
      activeUsersLastHour,
    },
    timestamp: now,
  };
};

/**
 * Get user engagement metrics
 */
const getUserEngagement = async () => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsersLast7Days,
    activeUsersLast30Days,
    usersWithMealLogs,
    usersWithGlucoseLogs,
    avgMealLogsPerUser,
    avgGlucoseLogsPerUser,
  ] = await Promise.all([
    User.countDocuments({ role: { $ne: "admin" } }),
    User.countDocuments({
      role: { $ne: "admin" },
      lastLoginAt: { $gte: sevenDaysAgo },
    }),
    User.countDocuments({
      role: { $ne: "admin" },
      lastLoginAt: { $gte: thirtyDaysAgo },
    }),
    MealLog.distinct("userId").then((ids) => ids.length),
    GlucoseLog.distinct("userId").then((ids) => ids.length),
    MealLog.aggregate([
      { $group: { _id: "$userId", count: { $sum: 1 } } },
      { $group: { _id: null, avg: { $avg: "$count" } } },
    ]).then((result) => (result[0] ? Math.round(result[0].avg * 10) / 10 : 0)),
    GlucoseLog.aggregate([
      { $group: { _id: "$userId", count: { $sum: 1 } } },
      { $group: { _id: null, avg: { $avg: "$count" } } },
    ]).then((result) => (result[0] ? Math.round(result[0].avg * 10) / 10 : 0)),
  ]);

  return {
    totalUsers,
    activeUsers: {
      last7Days: activeUsersLast7Days,
      last30Days: activeUsersLast30Days,
      engagementRate7Days:
        totalUsers > 0
          ? ((activeUsersLast7Days / totalUsers) * 100).toFixed(2)
          : 0,
      engagementRate30Days:
        totalUsers > 0
          ? ((activeUsersLast30Days / totalUsers) * 100).toFixed(2)
          : 0,
    },
    featureUsage: {
      usersWithMealLogs,
      usersWithGlucoseLogs,
      mealLogAdoptionRate:
        totalUsers > 0
          ? ((usersWithMealLogs / totalUsers) * 100).toFixed(2)
          : 0,
      glucoseLogAdoptionRate:
        totalUsers > 0
          ? ((usersWithGlucoseLogs / totalUsers) * 100).toFixed(2)
          : 0,
    },
    averages: {
      mealLogsPerUser: avgMealLogsPerUser,
      glucoseLogsPerUser: avgGlucoseLogsPerUser,
    },
  };
};

/**
 * Get recent user registrations
 */
const getRecentUsers = async (limit = 10) => {
  const users = await User.find({ role: { $ne: "admin" } })
    .select("name email createdAt lastLoginAt")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return users;
};

/**
 * Get activity heatmap data (hourly distribution)
 */
const getActivityHeatmap = async (days = 7) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const activityData = await MealLog.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          dayOfWeek: { $dayOfWeek: "$createdAt" },
          hour: { $hour: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.dayOfWeek": 1, "_id.hour": 1 } },
  ]);

  return activityData.map((item) => ({
    dayOfWeek: item._id.dayOfWeek,
    hour: item._id.hour,
    count: item.count,
  }));
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
