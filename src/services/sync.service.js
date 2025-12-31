const MealLog = require("../models/mealLog.model");
const GlucoseLog = require("../models/glucoseLog.model");
const SyncCheckpoint = require("../models/syncCheckpoint.model");
const FoodItem = require("../models/food.model");
const { isProcessed, markProcessed } = require("../utils/idempotency.util");
const { getFoodsChangedSince, getServerVersion } = require("./food.service");
const { getRulesChangedSince } = require("./rule.service");

/**
 * Upload logs from client (sync endpoint)
 */
const uploadLogs = async (userId, { logs, clientVersion, lastSyncAt }) => {
  const results = {
    mealsAdded: 0,
    glucoseAdded: 0,
    duplicatesSkipped: 0,
  };

  // Process meal logs
  if (logs.meals && logs.meals.length > 0) {
    for (const meal of logs.meals) {
      // Check idempotency
      if (meal.clientGeneratedId && isProcessed(meal.clientGeneratedId)) {
        results.duplicatesSkipped++;
        continue;
      }

      try {
        // Calculate totals
        const totals = {
          calories: 0,
          carbs: 0,
          protein: 0,
          fibre: 0,
        };

        for (const entry of meal.entries) {
          const food = await FoodItem.findById(entry.foodId);
          if (food) {
            const multiplier = entry.grams / 100; // Nutrients are per 100g
            totals.calories += (food.nutrients.calories || 0) * multiplier;
            totals.carbs += (food.nutrients.carbs_g || 0) * multiplier;
            totals.protein += (food.nutrients.protein_g || 0) * multiplier;
            totals.fibre += (food.nutrients.fibre_g || 0) * multiplier;
          }
        }

        await MealLog.create({
          userId,
          entries: meal.entries,
          calculatedTotals: totals,
          clientGeneratedId: meal.clientGeneratedId,
          createdAt: meal.createdAt || new Date(),
        });

        if (meal.clientGeneratedId) {
          markProcessed(meal.clientGeneratedId);
        }

        results.mealsAdded++;
      } catch (error) {
        console.error("Error saving meal log:", error.message);
      }
    }
  }

  // Process glucose logs
  if (logs.glucose && logs.glucose.length > 0) {
    for (const glucose of logs.glucose) {
      // Check idempotency
      if (glucose.clientGeneratedId && isProcessed(glucose.clientGeneratedId)) {
        results.duplicatesSkipped++;
        continue;
      }

      try {
        await GlucoseLog.create({
          userId,
          valueMgDl: glucose.valueMgDl,
          type: glucose.type,
          timestamp: glucose.timestamp || new Date(),
          notes: glucose.notes,
          clientGeneratedId: glucose.clientGeneratedId,
        });

        if (glucose.clientGeneratedId) {
          markProcessed(glucose.clientGeneratedId);
        }

        results.glucoseAdded++;
      } catch (error) {
        console.error("Error saving glucose log:", error.message);
      }
    }
  }

  // Update sync checkpoint
  const serverVersion = await getServerVersion();

  await SyncCheckpoint.findOneAndUpdate(
    { userId },
    {
      clientVersion: clientVersion || 0,
      serverVersion,
      lastSyncedAt: new Date(),
    },
    { upsert: true }
  );

  // Get changed foods and rules
  const foodsChanged = await getFoodsChangedSince(clientVersion || 0);
  const rulesChanged = await getRulesChangedSince(clientVersion || 0);

  return {
    accepted: true,
    results,
    serverVersion,
    foodsChanged,
    rulesChanged,
  };
};

/**
 * Get updates since client version (delta sync)
 */
const getUpdates = async (userId, clientVersion = 0) => {
  const serverVersion = await getServerVersion();

  // Get changed items
  const foodsChanged = await getFoodsChangedSince(clientVersion);
  const rulesChanged = await getRulesChangedSince(clientVersion);

  // Update checkpoint
  await SyncCheckpoint.findOneAndUpdate(
    { userId },
    {
      clientVersion,
      serverVersion,
      lastSyncedAt: new Date(),
    },
    { upsert: true }
  );

  return {
    foodsChanged,
    rulesChanged,
    serverVersion,
  };
};

/**
 * Get full sync data (for first-time install or forced resync)
 */
const getFullSync = async (userId) => {
  const [foods, rules, serverVersion] = await Promise.all([
    FoodItem.find({ deleted: false }).lean(),
    require("../models/ruleTemplate.model").find({ deleted: false }).lean(),
    getServerVersion(),
  ]);

  // Update checkpoint
  await SyncCheckpoint.findOneAndUpdate(
    { userId },
    {
      clientVersion: 0,
      serverVersion,
      lastSyncedAt: new Date(),
    },
    { upsert: true }
  );

  return {
    foods,
    rules,
    serverVersion,
  };
};

/**
 * Get user's meal logs
 */
const getUserMealLogs = async (userId, { from, to, page = 1, limit = 50 }) => {
  const query = { userId };

  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    MealLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("entries.foodId", "localName category")
      .lean(),
    MealLog.countDocuments(query),
  ]);

  return {
    logs,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get user's glucose logs
 */
const getUserGlucoseLogs = async (
  userId,
  { from, to, page = 1, limit = 50 }
) => {
  const query = { userId };

  if (from || to) {
    query.timestamp = {};
    if (from) query.timestamp.$gte = new Date(from);
    if (to) query.timestamp.$lte = new Date(to);
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    GlucoseLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    GlucoseLog.countDocuments(query),
  ]);

  return {
    logs,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  uploadLogs,
  getUpdates,
  getFullSync,
  getUserMealLogs,
  getUserGlucoseLogs,
};
