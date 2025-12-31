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
 * /sync/upload:
 *   post:
 *     summary: Upload meal and glucose logs (idempotent) [USER]
 *     description: Requires user authentication. Upload meal and glucose logs with duplicate prevention.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mealLogs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - clientGeneratedId
 *                     - userId
 *                     - timestamp
 *                     - foods
 *                   properties:
 *                     clientGeneratedId:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     foods:
 *                       type: array
 *               glucoseLogs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - clientGeneratedId
 *                     - userId
 *                     - timestamp
 *                     - value
 *                     - unit
 *                     - type
 *     responses:
 *       200:
 *         description: Logs uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     mealLogs:
 *                       type: object
 *                       properties:
 *                         processed:
 *                           type: number
 *                         duplicates:
 *                           type: number
 *                     glucoseLogs:
 *                       type: object
 *       400:
 *         description: Validation error
 */
const uploadLogs = asyncHandler(async (req, res) => {
  const { logs, clientVersion, lastSyncAt } = req.body;
  const userId = req.user.id;

  const result = await syncService.uploadLogs(userId, {
    logs: logs || {},
    clientVersion,
    lastSyncAt,
  });

  res.json({
    success: true,
    message: "Logs uploaded successfully",
    accepted: result.accepted,
    results: result.results,
    serverVersion: result.serverVersion,
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
 *         description: Start date for aggregation
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for aggregation
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
 *                     glucoseLogs:
 *                       type: array
 *                     stats:
 *                       type: object
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
  uploadLogs,
  getDeltaUpdates,
  getFullSync,
  getUserAggregations,
};
