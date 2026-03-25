const syncService = require("../services/sync.service");
const { asyncHandler } = require("../middlewares/error.middleware");
const { sendSuccess, sendError } = require("../utils/response.util");
const { t } = require("../utils/i18n.util");
const {
  explainMealRecommendation: explainMealRecommendationWithAI,
  getChatConversationList,
  getChatConversation: getChatConversationById,
  deleteChatConversation,
  clearChatConversations,
  chatWithAssistant: chatWithAssistantService,
  createTextChunks,
} = require("../services/ai.service");

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Reporting and analytics endpoints (requires authentication)
 */

/**
 * @swagger
 * /reports/user/{userId}/nutrition:
 *   get:
 *     summary: Get user's nutrition report for date range [USER]
 *     description: Requires user authentication. Users can only view their own reports unless they are admins.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date
 *     responses:
 *       200:
 *         description: Nutrition report
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
 *                       properties:
 *                         totalMeals:
 *                           type: number
 *                         totalGlucoseReadings:
 *                           type: number
 *                         avgCalories:
 *                           type: number
 *                         avgCarbs:
 *                           type: number
 *                         avgProtein:
 *                           type: number
 *                         avgFat:
 *                           type: number
 *                         avgGlucose:
 *                           type: number
 *       400:
 *         description: Missing required parameters
 *       403:
 *         description: Not authorized to view this user's report
 */
const getUserNutritionReport = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { from, to } = req.query;

  if (!from || !to) {
    return sendError(res, {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: t("report_range_required", "english"),
    });
  }

  // Authorization: user can only view their own report unless admin
  if (req.user.role !== "admin" && req.user.id !== userId) {
    return sendError(res, {
      statusCode: 403,
      code: "FORBIDDEN",
      message: t("report_forbidden", "english"),
    });
  }

  // Get meal logs and glucose logs for the date range without pagination
  const [mealLogsResult, glucoseLogsResult] = await Promise.all([
    syncService.getUserMealLogs(userId, { from, to, limit: 10000 }),
    syncService.getUserGlucoseLogs(userId, { from, to, limit: 10000 }),
  ]);

  const mealLogs = mealLogsResult.logs;
  const glucoseLogs = glucoseLogsResult.logs;

  // Calculate additional statistics
  const stats = {
    totalMeals: mealLogs.length,
    totalGlucoseReadings: glucoseLogs.length,
    avgCalories: 0,
    avgCarbs: 0,
    avgProtein: 0,
    avgFat: 0,
    avgGlucose: 0,
  };

  if (mealLogs.length > 0) {
    const totals = mealLogs.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.calculatedTotals?.calories || 0),
        carbs: acc.carbs + (meal.calculatedTotals?.carbs || 0),
        protein: acc.protein + (meal.calculatedTotals?.protein || 0),
        fat: acc.fat + (meal.calculatedTotals?.fat || 0),
      }),
      { calories: 0, carbs: 0, protein: 0, fat: 0 }
    );

    stats.avgCalories = Math.round(totals.calories / mealLogs.length);
    stats.avgCarbs = Math.round(totals.carbs / mealLogs.length);
    stats.avgProtein = Math.round(totals.protein / mealLogs.length);
    stats.avgFat = Math.round(totals.fat / mealLogs.length);
  }

  if (glucoseLogs.length > 0) {
    const totalGlucose = glucoseLogs.reduce(
      (sum, log) => sum + (log.valueMgDl || log.value || 0),
      0
    );
    stats.avgGlucose = Math.round(totalGlucose / glucoseLogs.length);
  }

  return sendSuccess(res, {
    data: {
      mealLogs,
      glucoseLogs,
      stats,
    },
  });
});

const explainMealRecommendation = asyncHandler(async (req, res) => {
  const {
    mealType,
    selectedFoods = [],
    maxCarbsAllowed,
    lastGlucose,
    alerts = [],
    tips = [],
    profile = req.user?.profile || {},
  } = req.body || {};

  if (!mealType || !Array.isArray(selectedFoods) || selectedFoods.length === 0) {
    return sendError(res, {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: t("validation_meal_explanation_required", "english"),
    });
  }

  const explanation = await explainMealRecommendationWithAI({
    mealType,
    selectedFoods,
    maxCarbsAllowed,
    lastGlucose,
    alerts,
    tips,
    profile,
  });

  return sendSuccess(res, {
    data: explanation,
  });
});

const getChatConversations = asyncHandler(async (req, res) => {
  const conversations = await getChatConversationList(req.user._id);

  return sendSuccess(res, {
    data: conversations,
  });
});

const getChatConversation = asyncHandler(async (req, res) => {
  const conversation = await getChatConversationById(req.user._id, req.params.id);

  return sendSuccess(res, {
    data: conversation,
  });
});

const removeChatConversation = asyncHandler(async (req, res) => {
  const result = await deleteChatConversation(req.user._id, req.params.id);

  return sendSuccess(res, {
    data: result,
  });
});

const removeAllChatConversations = asyncHandler(async (req, res) => {
  const result = await clearChatConversations(req.user._id);

  return sendSuccess(res, {
    data: result,
  });
});

const chatWithAssistant = asyncHandler(async (req, res) => {
  const result = await chatWithAssistantService({
    user: req.user,
    message: req.body?.message,
    conversationId: req.body?.conversationId,
  });

  return sendSuccess(res, {
    data: result,
  });
});

const streamChatWithAssistant = asyncHandler(async (req, res) => {
  const result = await chatWithAssistantService({
    user: req.user,
    message: req.body?.message,
    conversationId: req.body?.conversationId,
  });

  const chunks =
    result?.message?.chunks && result.message.chunks.length > 0
      ? result.message.chunks
      : createTextChunks(result?.message?.content || "");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  res.write(
    `event: conversation\ndata: ${JSON.stringify({
      conversation: result.conversation,
      language: "english",
    })}\n\n`
  );

  chunks.forEach((chunk, index) => {
    res.write(
      `event: chunk\ndata: ${JSON.stringify({
        index,
        content: chunk,
      })}\n\n`
    );
  });

  res.write(
    `event: done\ndata: ${JSON.stringify({
      status: t("chat_stream_done", "english"),
      message: result.message,
    })}\n\n`
  );
  res.end();
});

module.exports = {
  getUserNutritionReport,
  explainMealRecommendation,
  getChatConversations,
  getChatConversation,
  removeChatConversation,
  removeAllChatConversations,
  chatWithAssistant,
  streamChatWithAssistant,
};
