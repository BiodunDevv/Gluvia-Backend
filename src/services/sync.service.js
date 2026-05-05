const MealLog = require("../models/mealLog.model");
const GlucoseLog = require("../models/glucoseLog.model");
const SyncCheckpoint = require("../models/syncCheckpoint.model");
const FoodItem = require("../models/food.model");
const RuleTemplate = require("../models/ruleTemplate.model");
const { isProcessed, markProcessed } = require("../utils/idempotency.util");
const { getFoodsChangedSince, getServerVersion } = require("./food.service");
const { getRulesChangedSince } = require("./rule.service");
const notificationService = require("./notification.service");
const mongoose = require("mongoose");

const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MIN_GLUCOSE_MGDL = 20;
const MAX_GLUCOSE_MGDL = 600;

const createValidationError = (message, details) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";
  if (details !== undefined) {
    error.details = details;
  }
  return error;
};

const normalizeEventTimestamp = (value, fieldName = "timestamp") => {
  const resolved = value ? new Date(value) : new Date();

  if (Number.isNaN(resolved.getTime())) {
    throw createValidationError(`Invalid ${fieldName}`, { field: fieldName });
  }

  if (resolved.getTime() > Date.now() + MAX_FUTURE_SKEW_MS) {
    throw createValidationError(`${fieldName} cannot be in the future`, {
      field: fieldName,
    });
  }

  return resolved;
};

const normalizeMealPayload = async (meal) => {
  if (!meal?.clientGeneratedId?.trim()) {
    throw createValidationError("clientGeneratedId is required", {
      field: "clientGeneratedId",
    });
  }

  const rawEntries = Array.isArray(meal.entries)
    ? meal.entries
    : Array.isArray(meal.foods)
      ? meal.foods
      : [];

  if (rawEntries.length === 0) {
    throw createValidationError("Meal log must include at least one entry", {
      field: "entries",
    });
  }

  const entryFoodIds = [
    ...new Set(
      rawEntries
        .map((entry) => entry?.foodId || entry?._id)
        .filter((foodId) => typeof foodId === "string" && foodId.trim())
    ),
  ];

  if (entryFoodIds.length !== rawEntries.length) {
    throw createValidationError("Each meal entry must include a foodId", {
      field: "entries",
    });
  }

  const validFoodIds = entryFoodIds.filter((foodId) =>
    mongoose.Types.ObjectId.isValid(foodId)
  );

  const foods = await FoodItem.find({
    _id: { $in: validFoodIds },
    deleted: false,
  }).lean();

  const foodMap = new Map(foods.map((food) => [String(food._id), food]));
  const missingFoodIds = entryFoodIds.filter((foodId) => !foodMap.has(foodId));

  if (missingFoodIds.length > 0) {
    throw createValidationError("Meal log references invalid foods", {
      field: "entries",
      foodIds: missingFoodIds,
    });
  }

  const totals = { calories: 0, carbs: 0, protein: 0, fibre: 0 };
  const entries = rawEntries.map((entry) => {
    const foodId = entry.foodId || entry._id;
    const food = foodMap.get(String(foodId));
    const snapshotName =
      entry.localName || entry.foodName || entry.name || entry.canonicalName;

    if (!food) {
      throw createValidationError("Meal log references invalid foods", {
        field: "entries",
        foodId,
        foodName: snapshotName,
      });
    }

    const quantity =
      Number.isFinite(entry.quantity) && entry.quantity > 0 ? entry.quantity : 1;

    let grams =
      Number.isFinite(entry.grams) && entry.grams > 0 ? entry.grams : null;
    let portionName = entry.portionName || entry.portionSize || null;

    if (!grams) {
      const matchedPortion = food.portionSizes?.find(
        (portion) =>
          portion.name === entry.portionName || portion.name === entry.portionSize
      );

      if (matchedPortion) {
        grams = matchedPortion.grams * quantity;
        portionName = matchedPortion.name;
      }
    }

    if (!grams || grams <= 0) {
      throw createValidationError("Meal entry must include a valid portion size", {
        field: "entries",
        foodId,
      });
    }

    const multiplier = grams / 100;
    const carbs = (food.nutrients?.carbs_g || 0) * multiplier;

    totals.calories += (food.nutrients?.calories || 0) * multiplier;
    totals.carbs += carbs;
    totals.protein += (food.nutrients?.protein_g || 0) * multiplier;
    totals.fibre += (food.nutrients?.fibre_g || 0) * multiplier;

    return {
      foodId: food._id,
      localName: food.localName || snapshotName,
      canonicalName: food.canonicalName,
      category: food.category,
      portionName,
      portionSize: portionName,
      grams,
      quantity,
      carbs_g: carbs,
    };
  });

  return {
    clientGeneratedId: meal.clientGeneratedId.trim(),
    mealType: meal.mealType || "snack",
    entries,
    calculatedTotals: totals,
    notes: meal.notes,
    timestamp: normalizeEventTimestamp(meal.timestamp || meal.createdAt),
  };
};

const normalizeGlucosePayload = (glucose) => {
  if (!glucose?.clientGeneratedId?.trim()) {
    throw createValidationError("clientGeneratedId is required", {
      field: "clientGeneratedId",
    });
  }

  let valueMgDl = Number.isFinite(glucose.valueMgDl)
    ? glucose.valueMgDl
    : glucose.value;

  if (!Number.isFinite(valueMgDl)) {
    throw createValidationError("Glucose value is required", {
      field: "valueMgDl",
    });
  }

  if (glucose.unit === "mmol/L") {
    valueMgDl = Math.round(valueMgDl * 18);
  }

  if (valueMgDl < MIN_GLUCOSE_MGDL || valueMgDl > MAX_GLUCOSE_MGDL) {
    throw createValidationError("Glucose value is outside the supported range", {
      field: "valueMgDl",
      min: MIN_GLUCOSE_MGDL,
      max: MAX_GLUCOSE_MGDL,
    });
  }

  return {
    clientGeneratedId: glucose.clientGeneratedId.trim(),
    valueMgDl,
    unit: glucose.unit || "mg/dL",
    type: glucose.type,
    timestamp: normalizeEventTimestamp(glucose.timestamp || glucose.createdAt),
    notes: glucose.notes,
    mealRelated: Boolean(glucose.mealRelated),
    mealLogId: glucose.mealLogId,
    symptoms: Array.isArray(glucose.symptoms) ? glucose.symptoms : [],
  };
};

const mapDuplicateError = (error) =>
  error?.code === 11000 || error?.name === "MongoServerError";

const mapMealLogForClient = (log) => ({
  ...log,
  foods: log.entries,
});

const mapGlucoseLogForClient = (log) => ({
  ...log,
  value: log.valueMgDl,
});

/**
 * Upload logs from client (sync endpoint)
 */
const uploadLogs = async (userId, { logs, clientVersion, lastSyncAt }) => {
  const mealResults = await uploadMealLogs(userId, logs?.meals || []);
  const glucoseResults = await uploadGlucoseLogs(userId, logs?.glucose || []);

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
    results: {
      mealsAdded: mealResults.added,
      glucoseAdded: glucoseResults.added,
      duplicatesSkipped: mealResults.duplicates + glucoseResults.duplicates,
      errors: [...mealResults.errors, ...glucoseResults.errors],
    },
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

  if (!Number.isInteger(clientVersion) || clientVersion < 0) {
    return {
      foodsChanged: [],
      rulesChanged: [],
      serverVersion,
      requiresFullSync: true,
      reason: "invalid_client_version",
    };
  }

  if (clientVersion > serverVersion) {
    return {
      foodsChanged: [],
      rulesChanged: [],
      serverVersion,
      requiresFullSync: true,
      reason: "client_version_ahead_of_server",
    };
  }

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
    requiresFullSync: false,
  };
};

/**
 * Get full sync data (for first-time install or forced resync)
 */
const getFullSync = async (userId) => {
  const [foods, rules, serverVersion] = await Promise.all([
    FoodItem.find({ deleted: false })
      .select("-__v")
      .lean(),
    RuleTemplate.find({ deleted: false })
      .select("-__v")
      .lean(),
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
    query.timestamp = {};
    if (from) query.timestamp.$gte = new Date(from);
    if (to) query.timestamp.$lte = new Date(to);
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    MealLog.find(query)
      .sort({ timestamp: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v")
      .lean(),
    MealLog.countDocuments(query),
  ]);

  const foodIds = [
    ...new Set(
      logs.flatMap((log) =>
        (log.entries || [])
          .map((entry) => entry?.foodId)
          .filter(Boolean)
          .map((foodId) => String(foodId))
      )
    ),
  ];
  const foods =
    foodIds.length > 0
      ? await FoodItem.find({ _id: { $in: foodIds } })
          .select("localName category")
          .lean()
      : [];
  const foodMap = new Map(foods.map((food) => [String(food._id), food]));

  const hydratedLogs = logs.map((log) => ({
    ...log,
    entries: (log.entries || []).map((entry) => {
      const food = foodMap.get(String(entry.foodId));
      return {
        ...entry,
        foodId: food
          ? {
              _id: entry.foodId,
              localName: food.localName || entry.localName,
              canonicalName: food.canonicalName || entry.canonicalName,
              category: food.category || entry.category,
            }
          : {
              _id: entry.foodId,
              localName: entry.localName || entry.canonicalName || "Food item",
              canonicalName: entry.canonicalName,
              category: entry.category || "Food",
            },
      };
    }),
  }));

  return {
    logs: hydratedLogs.map(mapMealLogForClient),
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
      .sort({ timestamp: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    GlucoseLog.countDocuments(query),
  ]);

  return {
    logs: logs.map(mapGlucoseLogForClient),
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
    if (meal?.clientGeneratedId && isProcessed(`${userId}:${meal.clientGeneratedId}`)) {
      results.duplicates++;
      continue;
    }

    try {
      const normalizedMeal = await normalizeMealPayload(meal);

      await MealLog.create({
        userId,
        ...normalizedMeal,
      });

      results.added++;
      markProcessed(`${userId}:${normalizedMeal.clientGeneratedId}`);
    } catch (error) {
      if (mapDuplicateError(error)) {
        results.duplicates++;
        continue;
      }

      results.errors.push({
        clientGeneratedId: meal.clientGeneratedId,
        error: error.message,
        code: error.code || "MEAL_LOG_ERROR",
      });
    }
  }

  if (results.added > 0) {
    await notificationService.createNotification({
      userId,
      type: "meal",
      title: "Meal logged",
      body:
        results.added === 1
          ? "Your meal was saved successfully."
          : `${results.added} meals were saved successfully.`,
      data: { added: results.added },
      dedupeKey: notificationService.buildDedupeKey(
        "meal_upload",
        userId.toString(),
        mealLogs.map((meal) => meal.clientGeneratedId).filter(Boolean).sort().join(",")
      ),
    });
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
    if (
      glucose?.clientGeneratedId &&
      isProcessed(`${userId}:${glucose.clientGeneratedId}`)
    ) {
      results.duplicates++;
      continue;
    }

    try {
      const normalizedGlucose = normalizeGlucosePayload(glucose);

      await GlucoseLog.create({
        userId,
        ...normalizedGlucose,
      });

      results.added++;
      markProcessed(`${userId}:${normalizedGlucose.clientGeneratedId}`);
    } catch (error) {
      if (mapDuplicateError(error)) {
        results.duplicates++;
        continue;
      }

      results.errors.push({
        clientGeneratedId: glucose.clientGeneratedId,
        error: error.message,
        code: error.code || "GLUCOSE_LOG_ERROR",
      });
    }
  }

  if (results.added > 0) {
    await notificationService.createNotification({
      userId,
      type: "glucose",
      title: "Glucose reading saved",
      body:
        results.added === 1
          ? "Your glucose reading was saved successfully."
          : `${results.added} glucose readings were saved successfully.`,
      data: { added: results.added },
      dedupeKey: notificationService.buildDedupeKey(
        "glucose_upload",
        userId.toString(),
        glucoseLogs
          .map((glucose) => glucose.clientGeneratedId)
          .filter(Boolean)
          .sort()
          .join(",")
      ),
    });
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
