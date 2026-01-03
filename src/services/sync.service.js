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

/**
 * Upload meal logs only
 */
const uploadMealLogs = async (userId, mealLogs) => {
  const results = {
    added: 0,
    duplicates: 0,
    errors: [],
  };

  if (!mealLogs || mealLogs.length === 0) {
    return results;
  }

  for (const meal of mealLogs) {
    // Check idempotency
    if (meal.clientGeneratedId) {
      const existing = await MealLog.findOne({
        clientGeneratedId: meal.clientGeneratedId,
      });
      if (existing) {
        results.duplicates++;
        continue;
      }
    }

    try {
      // Calculate totals from foods
      const totals = { calories: 0, carbs: 0, protein: 0, fibre: 0 };
      const entries = [];

      if (meal.foods && meal.foods.length > 0) {
        for (const foodEntry of meal.foods) {
          const food = await FoodItem.findById(foodEntry.foodId);
          if (food) {
            // Find portion size or use default
            let grams = 100;
            const portion = food.portionSizes?.find(
              (p) => p.name === foodEntry.portionSize
            );
            if (portion) {
              grams = portion.grams * (foodEntry.quantity || 1);
            }

            const multiplier = grams / 100;
            totals.calories += (food.nutrients?.calories || 0) * multiplier;
            totals.carbs += (food.nutrients?.carbs_g || 0) * multiplier;
            totals.protein += (food.nutrients?.protein_g || 0) * multiplier;
            totals.fibre += (food.nutrients?.fibre_g || 0) * multiplier;

            entries.push({
              foodId: food._id,
              portionName: foodEntry.portionSize,
              portionSize: foodEntry.portionSize,
              grams,
              quantity: foodEntry.quantity || 1,
              carbs_g: (food.nutrients?.carbs_g || 0) * multiplier,
            });
          }
        }
      }

      await MealLog.create({
        userId,
        mealType: meal.mealType || "snack",
        entries,
        calculatedTotals: totals,
        notes: meal.notes,
        timestamp: meal.timestamp || new Date(),
        clientGeneratedId: meal.clientGeneratedId,
      });

      results.added++;
    } catch (error) {
      console.error("Error saving meal log:", error.message);
      results.errors.push({
        clientGeneratedId: meal.clientGeneratedId,
        error: error.message,
      });
    }
  }

  return results;
};

/**
 * Upload glucose logs only
 */
const uploadGlucoseLogs = async (userId, glucoseLogs) => {
  const results = {
    added: 0,
    duplicates: 0,
    errors: [],
  };

  if (!glucoseLogs || glucoseLogs.length === 0) {
    return results;
  }

  for (const glucose of glucoseLogs) {
    // Check idempotency
    if (glucose.clientGeneratedId) {
      const existing = await GlucoseLog.findOne({
        clientGeneratedId: glucose.clientGeneratedId,
      });
      if (existing) {
        results.duplicates++;
        continue;
      }
    }

    try {
      // Convert value if needed (mmol/L to mg/dL)
      let valueMgDl = glucose.value;
      if (glucose.unit === "mmol/L") {
        valueMgDl = Math.round(glucose.value * 18);
      }

      await GlucoseLog.create({
        userId,
        valueMgDl,
        unit: glucose.unit || "mg/dL",
        type: glucose.type,
        timestamp: glucose.timestamp || new Date(),
        notes: glucose.notes,
        mealRelated: glucose.mealRelated || false,
        mealLogId: glucose.mealLogId,
        symptoms: glucose.symptoms || [],
        clientGeneratedId: glucose.clientGeneratedId,
      });

      results.added++;
    } catch (error) {
      console.error("Error saving glucose log:", error.message);
      results.errors.push({
        clientGeneratedId: glucose.clientGeneratedId,
        error: error.message,
      });
    }
  }

  return results;
};

module.exports = {
  uploadLogs,
  getUpdates,
  getFullSync,
  getUserMealLogs,
  getUserGlucoseLogs,
  uploadMealLogs,
  uploadGlucoseLogs,
};
