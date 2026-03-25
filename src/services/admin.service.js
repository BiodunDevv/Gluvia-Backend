const User = require("../models/user.model");
const FoodItem = require("../models/food.model");
const MealLog = require("../models/mealLog.model");
const GlucoseLog = require("../models/glucoseLog.model");
const Audit = require("../models/audit.model");
const auditService = require("./audit.service");
const crypto = require("crypto");

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getFirstCount = async (pipeline) => {
  const result = await User.aggregate(pipeline);
  return result[0]?.count || 0;
};

const getModelFirstCount = async (Model, pipeline) => {
  const result = await Model.aggregate(pipeline);
  return result[0]?.count || 0;
};

/**
 * Get all admin users
 */
const getAllAdmins = async () => {
  const admins = await User.find({ role: "admin" })
    .select("-passwordHash")
    .sort({ createdAt: -1 })
    .lean();

  return admins;
};

/**
 * Get admin by ID
 */
const getAdminById = async (adminId) => {
  const admin = await User.findOne({ _id: adminId, role: "admin" }).select(
    "-passwordHash"
  ).lean();

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
  admin.passwordResetExpires = resetTokenExpiry;
  await admin.save();

  return { admin, resetToken };
};

/**
 * Get admin statistics
 */
const getAdminStats = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [totalAdmins, deactivatedAdmins, recentlyActiveAdmins] = await Promise.all([
    getFirstCount([
      { $match: { role: "admin", deleted: { $ne: true } } },
      { $count: "count" },
    ]),
    getFirstCount([
      { $match: { role: "admin", deleted: true } },
      { $count: "count" },
    ]),
    getFirstCount([
      {
        $match: {
          role: "admin",
          deleted: { $ne: true },
          lastLoginAt: { $gte: thirtyDaysAgo },
        },
      },
      { $count: "count" },
    ]),
  ]);
  // Count all non-deleted admins as active
  const activeAdmins = totalAdmins;

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
    .sort({ createdAt: -1 })
    .lean();

  return users;
};

const searchUsers = async (query, limit = 10) => {
  const trimmedQuery = String(query || "").trim();

  if (!trimmedQuery) {
    return [];
  }

  const regex = new RegExp(escapeRegex(trimmedQuery), "i");

  return User.find({
    role: { $ne: "admin" },
    deleted: { $ne: true },
    $or: [{ name: regex }, { email: regex }, { phone: regex }],
  })
    .select("name email phone role")
    .sort({ lastLoginAt: -1, createdAt: -1 })
    .limit(Math.min(Number(limit) || 10, 20))
    .lean();
};

/**
 * Get user by ID (any user, not just admins)
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId).select("-passwordHash").lean();

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
  user.passwordResetExpires = resetTokenExpiry;
  await user.save();

  return { user, resetToken };
};

/**
 * Get user statistics
 */
const getUserStats = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [totalUsers, deactivatedUsers, diabeticUsers, recentlyActiveUsers] =
    await Promise.all([
      getFirstCount([
        { $match: { role: { $ne: "admin" }, deleted: { $ne: true } } },
        { $count: "count" },
      ]),
      getFirstCount([
        { $match: { role: { $ne: "admin" }, deleted: true } },
        { $count: "count" },
      ]),
      getFirstCount([
        {
          $match: {
            role: { $ne: "admin" },
            deleted: { $ne: true },
            "profile.diabetesType": { $exists: true, $ne: null },
          },
        },
        { $count: "count" },
      ]),
      getFirstCount([
        {
          $match: {
            role: { $ne: "admin" },
            deleted: { $ne: true },
            lastLoginAt: { $gte: thirtyDaysAgo },
          },
        },
        { $count: "count" },
      ]),
    ]);
  // Count all non-deleted users as active
  const activeUsers = totalUsers;

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
  const userStatsPromise = User.aggregate([
    {
      $facet: {
        totalUsers: [{ $match: { role: { $ne: "admin" } } }, { $count: "count" }],
        activeUsers: [
          { $match: { role: { $ne: "admin" }, lastLoginAt: { $gte: sevenDaysAgo } } },
          { $count: "count" },
        ],
        newUsersLast30Days: [
          { $match: { role: { $ne: "admin" }, createdAt: { $gte: thirtyDaysAgo } } },
          { $count: "count" },
        ],
        newUsersLast7Days: [
          { $match: { role: { $ne: "admin" }, createdAt: { $gte: sevenDaysAgo } } },
          { $count: "count" },
        ],
        totalAdmins: [{ $match: { role: "admin" } }, { $count: "count" }],
      },
    },
  ]);

  // Food database statistics
  const foodStatsPromise = FoodItem.aggregate([
    {
      $facet: {
        totals: [{ $match: { deleted: false } }, { $count: "count" }],
        newLast30Days: [
          { $match: { deleted: false, createdAt: { $gte: thirtyDaysAgo } } },
          { $count: "count" },
        ],
        foodsByCategory: [
          { $match: { deleted: false } },
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ],
      },
    },
  ]);

  // Activity statistics
  const activityStatsPromise = Promise.all([
    MealLog.aggregate([
      {
        $facet: {
          total: [{ $count: "count" }],
          last24h: [{ $match: { createdAt: { $gte: twentyFourHoursAgo } } }, { $count: "count" }],
          last7Days: [{ $match: { createdAt: { $gte: sevenDaysAgo } } }, { $count: "count" }],
        },
      },
    ]),
    GlucoseLog.aggregate([
      {
        $facet: {
          total: [{ $count: "count" }],
          last24h: [{ $match: { timestamp: { $gte: twentyFourHoursAgo } } }, { $count: "count" }],
          last7Days: [{ $match: { timestamp: { $gte: sevenDaysAgo } } }, { $count: "count" }],
        },
      },
    ]),
  ]);

  // Recent audit activity
  const recentAuditsPromise = Audit.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .select("action who target createdAt")
    .populate("who", "name email")
    .lean();

  const [[userStats], [foodStats], [mealActivityStats, glucoseActivityStats], recentAudits] =
    await Promise.all([
      userStatsPromise,
      foodStatsPromise,
      activityStatsPromise,
      recentAuditsPromise,
    ]);

  const totalUsers = userStats?.totalUsers?.[0]?.count || 0;
  const activeUsers = userStats?.activeUsers?.[0]?.count || 0;
  const newUsersLast30Days = userStats?.newUsersLast30Days?.[0]?.count || 0;
  const newUsersLast7Days = userStats?.newUsersLast7Days?.[0]?.count || 0;
  const totalAdmins = userStats?.totalAdmins?.[0]?.count || 0;
  const totalFoods = foodStats?.totals?.[0]?.count || 0;
  const newFoodsLast30Days = foodStats?.newLast30Days?.[0]?.count || 0;
  const foodsByCategory = foodStats?.foodsByCategory || [];
  const totalMealLogs = mealActivityStats?.total?.[0]?.count || 0;
  const mealLogsLast24h = mealActivityStats?.last24h?.[0]?.count || 0;
  const mealLogsLast7Days = mealActivityStats?.last7Days?.[0]?.count || 0;
  const totalGlucoseLogs = glucoseActivityStats?.total?.[0]?.count || 0;
  const glucoseLogsLast24h = glucoseActivityStats?.last24h?.[0]?.count || 0;
  const glucoseLogsLast7Days = glucoseActivityStats?.last7Days?.[0]?.count || 0;

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
      timestamp: audit.createdAt,
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
  const userGrowthMap = new Map(userGrowth.map((item) => [item._id, item]));
  const currentDate = new Date(startDate);
  const todayStr = endDate.toISOString().split("T")[0];

  // Loop through all dates from start to today (inclusive)
  while (true) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const dataPoint = userGrowthMap.get(dateStr);

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
  const mealLogMap = new Map(mealLogs.map((item) => [item._id, item]));
  const currentDate = new Date(startDate);
  const todayStr = endDate.toISOString().split("T")[0];

  while (true) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const dataPoint = mealLogMap.get(dateStr);

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
        avgGlucose: { $avg: "$valueMgDl" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill in missing dates up to today
  const chartData = [];
  const glucoseLogMap = new Map(glucoseLogs.map((item) => [item._id, item]));
  const currentDate = new Date(startDate);
  const todayStr = endDate.toISOString().split("T")[0];

  while (true) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const dataPoint = glucoseLogMap.get(dateStr);

    chartData.push({
      date: dateStr,
      count: dataPoint ? dataPoint.count : 0,
      average: dataPoint ? Math.round(dataPoint.avgGlucose * 10) / 10 : null,
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
    { $unwind: "$entries" },
    {
      $group: {
        _id: "$entries.foodId",
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

  const [auditStats, activeUsersLastHour] = await Promise.all([
    Audit.aggregate([
      { $match: { createdAt: { $gte: oneHourAgo } } },
      {
        $group: {
          _id: null,
          recentErrors: {
            $sum: {
              $cond: [
                {
                  $regexMatch: {
                    input: "$action",
                    regex: /error|failed/i,
                  },
                },
                1,
                0,
              ],
            },
          },
          recentLogins: {
            $sum: { $cond: [{ $eq: ["$action", "login"] }, 1, 0] },
          },
          failedLogins: {
            $sum: { $cond: [{ $eq: ["$action", "login_failed"] }, 1, 0] },
          },
        },
      },
    ]),
    getFirstCount([
      { $match: { lastLoginAt: { $gte: oneHourAgo } } },
      { $count: "count" },
    ]),
  ]);

  const recentErrors = auditStats[0]?.recentErrors || 0;
  const recentLogins = auditStats[0]?.recentLogins || 0;
  const failedLogins = auditStats[0]?.failedLogins || 0;

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
const getDistinctUserCount = async (Model) => {
  const result = await Model.aggregate([
    { $group: { _id: "$userId" } },
    { $count: "count" },
  ]);

  return result[0]?.count || 0;
};

const getAverageLogsPerUser = async (Model) => {
  const result = await Model.aggregate([
    { $group: { _id: "$userId", count: { $sum: 1 } } },
    { $group: { _id: null, avg: { $avg: "$count" } } },
  ]);

  return result[0] ? Math.round(result[0].avg * 10) / 10 : 0;
};

const getUserEngagement = async () => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [userStats, usersWithMealLogs, usersWithGlucoseLogs, avgMealLogsPerUser, avgGlucoseLogsPerUser] =
    await Promise.all([
      User.aggregate([
        {
          $facet: {
            totalUsers: [{ $match: { role: { $ne: "admin" } } }, { $count: "count" }],
            activeUsersLast7Days: [
              { $match: { role: { $ne: "admin" }, lastLoginAt: { $gte: sevenDaysAgo } } },
              { $count: "count" },
            ],
            activeUsersLast30Days: [
              { $match: { role: { $ne: "admin" }, lastLoginAt: { $gte: thirtyDaysAgo } } },
              { $count: "count" },
            ],
          },
        },
      ]),
      getDistinctUserCount(MealLog),
      getDistinctUserCount(GlucoseLog),
      getAverageLogsPerUser(MealLog),
      getAverageLogsPerUser(GlucoseLog),
    ]);

  const totalUsers = userStats[0]?.totalUsers?.[0]?.count || 0;
  const activeUsersLast7Days = userStats[0]?.activeUsersLast7Days?.[0]?.count || 0;
  const activeUsersLast30Days = userStats[0]?.activeUsersLast30Days?.[0]?.count || 0;

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
    .select("name email createdAt lastLoginAt profile.diabetesType deleted")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return users.map((user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    diabetesType: user.profile?.diabetesType,
    isActive: !user.deleted,
    lastLoginAt: user.lastLoginAt,
  }));
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
  searchUsers,
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
