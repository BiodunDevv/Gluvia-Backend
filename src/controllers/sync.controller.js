const syncService = require("../services/sync.service");
const { asyncHandler } = require("../middlewares/error.middleware");

/**
 * @swagger
 * tags:
 *   name: Sync
 *   description: Offline-first sync endpoints for meal and glucose logs (requires authentication)
 */

/**
 * @swagger
 * /sync/meals:
 *   post:
 *     summary: Upload meal logs only [USER]
 *     description: Upload meal logs with duplicate prevention. Each meal can contain multiple foods with portions.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mealLogs]
 *             properties:
 *               mealLogs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [clientGeneratedId, timestamp, foods]
 *                   properties:
 *                     clientGeneratedId:
 *                       type: string
 *                       example: "meal_1704312000_abc123"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-01-03T12:30:00.000Z"
 *                     mealType:
 *                       type: string
 *                       enum: [breakfast, lunch, dinner, snack]
 *                       example: "breakfast"
 *                     foods:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           foodId:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439011"
 *                           portionSize:
 *                             type: string
 *                             example: "Medium bowl"
 *                           quantity:
 *                             type: number
 *                             example: 1
 *                     notes:
 *                       type: string
 *                       example: "Light breakfast"
 *     responses:
 *       200:
 *         description: Meal logs uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 results:
 *                   type: object
 *                   properties:
 *                     added:
 *                       type: number
 *                     duplicates:
 *                       type: number
 *                     errors:
 *                       type: array
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
const uploadMealLogs = asyncHandler(async (req, res) => {
  const { mealLogs } = req.body;
  const userId = req.user.id;

  if (!mealLogs || !Array.isArray(mealLogs)) {
    return res.status(400).json({
      success: false,
      message: "mealLogs array is required",
    });
  }

  const results = await syncService.uploadMealLogs(userId, mealLogs);

  res.json({
    success: true,
    message: `${results.added} meal(s) logged successfully`,
    results,
  });
});

/**
 * @swagger
 * /sync/glucose:
 *   post:
 *     summary: Upload glucose logs only [USER]
 *     description: Upload blood glucose readings with duplicate prevention and symptom tracking.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [glucoseLogs]
 *             properties:
 *               glucoseLogs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [clientGeneratedId, timestamp, value, unit, type]
 *                   properties:
 *                     clientGeneratedId:
 *                       type: string
 *                       example: "glucose_1704312000_xyz789"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-01-03T12:30:00.000Z"
 *                     value:
 *                       type: number
 *                       example: 120
 *                     unit:
 *                       type: string
 *                       enum: [mg/dL, mmol/L]
 *                       example: "mg/dL"
 *                     type:
 *                       type: string
 *                       enum: [fasting, before_meal, after_meal, bedtime, random, 2hr_post_meal]
 *                       example: "fasting"
 *                     notes:
 *                       type: string
 *                       example: "Morning reading before breakfast"
 *                     mealRelated:
 *                       type: boolean
 *                       example: false
 *                     mealLogId:
 *                       type: string
 *                       example: "meal_1704312000_abc123"
 *                     symptoms:
 *                       type: array
 *                       items:
 *                         type: string
 *                         enum: [dizzy, shaky, sweaty, tired, hungry, thirsty, blurred_vision, none]
 *                       example: ["none"]
 *     responses:
 *       200:
 *         description: Glucose logs uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 results:
 *                   type: object
 *                   properties:
 *                     added:
 *                       type: number
 *                     duplicates:
 *                       type: number
 *                     errors:
 *                       type: array
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
const uploadGlucoseLogs = asyncHandler(async (req, res) => {
  const { glucoseLogs } = req.body;
  const userId = req.user.id;

  if (!glucoseLogs || !Array.isArray(glucoseLogs)) {
    return res.status(400).json({
      success: false,
      message: "glucoseLogs array is required",
    });
  }

  const results = await syncService.uploadGlucoseLogs(userId, glucoseLogs);

  res.json({
    success: true,
    message: `${results.added} glucose reading(s) logged successfully`,
    results,
  });
});

/**
 * @swagger
 * /sync/updates:
 *   get:
 *     summary: Get delta updates since client version [USER]
 *     description: Requires user authentication. Get incremental updates based on client version.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clientVersion
 *         required: true
 *         schema:
 *           type: integer
 *         description: Client's current sync version
 *     responses:
 *       200:
 *         description: Delta updates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 serverVersion:
 *                   type: integer
 *                 clientVersion:
 *                   type: integer
 *                 updates:
 *                   type: object
 *                   properties:
 *                     foods:
 *                       type: array
 *                     rules:
 *                       type: array
 *       400:
 *         description: Missing clientVersion parameter
 */
const getDeltaUpdates = asyncHandler(async (req, res) => {
  const { clientVersion } = req.query;

  if (!clientVersion) {
    return res.status(400).json({
      success: false,
      message: "clientVersion query parameter is required",
    });
  }

  const userId = req.user.id;
  const result = await syncService.getUpdates(userId, Number(clientVersion));

  res.json({
    success: true,
    serverVersion: result.serverVersion,
    clientVersion: Number(clientVersion),
    foodsChanged: result.foodsChanged,
    rulesChanged: result.rulesChanged,
  });
});

/**
 * @swagger
 * /sync/full:
 *   get:
 *     summary: Get full sync data (first-time sync or force sync) [USER]
 *     description: Requires user authentication. Get complete sync data for initial sync or force refresh.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full sync data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 serverVersion:
 *                   type: integer
 *                 data:
 *                   type: object
 *                   properties:
 *                     foods:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FoodItem'
 *                     rules:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/RuleTemplate'
 *                     userCheckpoint:
 *                       type: object
 */
const getFullSync = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await syncService.getFullSync(userId);

  res.json({
    success: true,
    serverVersion: result.serverVersion,
    foods: result.foods,
    rules: result.rules,
  });
});

/**
 * @swagger
 * /sync/aggregations:
 *   get:
 *     summary: Get user's aggregated meal and glucose data [USER]
 *     description: Requires user authentication. Retrieve aggregated meal and glucose logs with optional date filtering.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering logs (ISO 8601 format)
 *         example: "2024-01-01T00:00:00.000Z"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering logs (ISO 8601 format)
 *         example: "2024-01-31T23:59:59.999Z"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of records per page
 *         example: 50
 *     responses:
 *       200:
 *         description: Aggregated data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     mealLogs:
 *                       type: array
 *                       description: User's meal log entries
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           clientGeneratedId:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           mealType:
 *                             type: string
 *                           foods:
 *                             type: array
 *                           totalCarbs:
 *                             type: number
 *                           totalCalories:
 *                             type: number
 *                     glucoseLogs:
 *                       type: array
 *                       description: User's glucose log entries
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: Database-generated ID
 *                             example: "60d5ec49f1b2c8b1a8e4d999"
 *                           clientGeneratedId:
 *                             type: string
 *                             description: Client-generated ID for sync
 *                             example: "glucose_1704312000_xyz789"
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                             description: When the reading was taken
 *                             example: "2024-01-03T14:30:00.000Z"
 *                           value:
 *                             type: number
 *                             description: Glucose reading value
 *                             example: 120
 *                           unit:
 *                             type: string
 *                             description: Unit of measurement
 *                             example: "mg/dL"
 *                           type:
 *                             type: string
 *                             description: Type of reading
 *                             example: "after_meal"
 *                           notes:
 *                             type: string
 *                             description: User notes
 *                             example: "Feeling good after lunch"
 *                           mealRelated:
 *                             type: boolean
 *                             description: If related to a meal
 *                             example: true
 *                           symptoms:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["none"]
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-03T14:30:05.000Z"
 *                     stats:
 *                       type: object
 *                       description: Summary statistics
 *                       properties:
 *                         glucoseStats:
 *                           type: object
 *                           properties:
 *                             average:
 *                               type: number
 *                               example: 125.5
 *                             min:
 *                               type: number
 *                               example: 85
 *                             max:
 *                               type: number
 *                               example: 180
 *                             count:
 *                               type: number
 *                               example: 45
 *                             inRange:
 *                               type: number
 *                               description: Readings in target range (70-180 mg/dL)
 *                               example: 38
 *                             unit:
 *                               type: string
 *                               example: "mg/dL"
 *                         mealStats:
 *                           type: object
 *                           properties:
 *                             totalMeals:
 *                               type: number
 *                               example: 21
 *                             averageCarbs:
 *                               type: number
 *                               example: 45.2
 *                             averageCalories:
 *                               type: number
 *                               example: 387.5
 *           examples:
 *             sampleAggregation:
 *               summary: Sample glucose and meal aggregation response
 *               value:
 *                 success: true
 *                 mealLogs:
 *                   - id: "60d5ec49f1b2c8b1a8e4d888"
 *                     clientGeneratedId: "meal_1704312000_abc123"
 *                     timestamp: "2024-01-03T12:30:00.000Z"
 *                     mealType: "lunch"
 *                     foods:
 *                       - foodId: "60d5ec49f1b2c8b1a8e4d456"
 *                         name: "Jollof Rice"
 *                         portionSize: "Medium bowl"
 *                         quantity: 1
 *                     totalCarbs: 65.5
 *                     totalCalories: 420
 *                 glucoseLogs:
 *                   - id: "60d5ec49f1b2c8b1a8e4d999"
 *                     clientGeneratedId: "glucose_1704312000_xyz789"
 *                     timestamp: "2024-01-03T12:15:00.000Z"
 *                     value: 95
 *                     unit: "mg/dL"
 *                     type: "before_meal"
 *                     notes: "Pre-lunch reading"
 *                     mealRelated: true
 *                     symptoms: ["none"]
 *                     createdAt: "2024-01-03T12:15:05.000Z"
 *                   - id: "60d5ec49f1b2c8b1a8e4d998"
 *                     clientGeneratedId: "glucose_1704314400_def456"
 *                     timestamp: "2024-01-03T14:30:00.000Z"
 *                     value: 140
 *                     unit: "mg/dL"
 *                     type: "2hr_post_meal"
 *                     notes: "2 hours after lunch"
 *                     mealRelated: true
 *                     symptoms: ["none"]
 *                     createdAt: "2024-01-03T14:30:05.000Z"
 *                 meta:
 *                   meals:
 *                     total: 21
 *                     page: 1
 *                     limit: 50
 *                     hasMore: false
 *                   glucose:
 *                     total: 45
 *                     page: 1
 *                     limit: 50
 *                     hasMore: false
 *                     stats:
 *                       average: 125.5
 *                       min: 85
 *                       max: 180
 *                       inRange: 38
 *                       unit: "mg/dL"
 */
const getUserAggregations = asyncHandler(async (req, res) => {
  const { from, to, page = 1, limit = 50 } = req.query;
  const userId = req.user.id;

  const [mealLogs, glucoseLogs] = await Promise.all([
    syncService.getUserMealLogs(userId, { from, to, page, limit }),
    syncService.getUserGlucoseLogs(userId, { from, to, page, limit }),
  ]);

  res.json({
    success: true,
    mealLogs: mealLogs.logs,
    glucoseLogs: glucoseLogs.logs,
    meta: {
      meals: mealLogs.meta,
      glucose: glucoseLogs.meta,
    },
  });
});

module.exports = {
  uploadMealLogs,
  uploadGlucoseLogs,
  getDeltaUpdates,
  getFullSync,
  getUserAggregations,
};
