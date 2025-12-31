const syncService = require("../services/sync.service");
const { asyncHandler } = require("../middlewares/error.middleware");

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
    return res.status(400).json({
      success: false,
      message: "from and to query parameters are required",
    });
  }

  // Authorization: user can only view their own report unless admin
  if (req.user.role !== "admin" && req.user.id !== userId) {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to view this report",
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
        calories: acc.calories + (meal.totalNutrients?.calories || 0),
        carbs: acc.carbs + (meal.totalNutrients?.carbohydrates || 0),
        protein: acc.protein + (meal.totalNutrients?.protein || 0),
        fat: acc.fat + (meal.totalNutrients?.fat || 0),
      }),
      { calories: 0, carbs: 0, protein: 0, fat: 0 }
    );

    stats.avgCalories = Math.round(totals.calories / mealLogs.length);
    stats.avgCarbs = Math.round(totals.carbs / mealLogs.length);
    stats.avgProtein = Math.round(totals.protein / mealLogs.length);
    stats.avgFat = Math.round(totals.fat / mealLogs.length);
  }

  if (glucoseLogs.length > 0) {
    const totalGlucose = glucoseLogs.reduce((sum, log) => sum + log.value, 0);
    stats.avgGlucose = Math.round(totalGlucose / glucoseLogs.length);
  }

  res.json({
    success: true,
    data: {
      mealLogs,
      glucoseLogs,
      stats,
    },
  });
});

module.exports = {
  getUserNutritionReport,
};
