const foodService = require("../services/food.service");
const { asyncHandler } = require("../middlewares/error.middleware");

/**
 * @swagger
 * tags:
 *   name: Foods
 *   description: Food database operations
 */

/**
 * @swagger
 * /foods:
 *   get:
 *     summary: Search and filter foods [PUBLIC]
 *     description: Public endpoint - No authentication required. Search and filter the food database.
 *     tags: [Foods]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Text search across food name, altNames, tags
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated tags to filter by
 *       - in: query
 *         name: maxGI
 *         schema:
 *           type: number
 *         description: Maximum glycemic index
 *       - in: query
 *         name: isVegetarian
 *         schema:
 *           type: boolean
 *         description: Filter vegetarian foods
 *       - in: query
 *         name: maxAffordability
 *         schema:
 *           type: number
 *         description: Maximum affordability level (1-5)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of foods with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FoodItem'
 *                 pagination:
 *                   type: object
 */
const getAllFoods = asyncHandler(async (req, res) => {
  const {
    search,
    tags,
    maxGI,
    category,
    affordability,
    page = 1,
    limit = 50,
  } = req.query;

  const filters = {};
  if (search) filters.search = search;
  if (tags) filters.tags = tags.split(",");
  if (maxGI) filters.gi_max = Number(maxGI);
  if (category) filters.category = category;
  if (affordability) filters.affordability = affordability;

  const result = await foodService.searchFoods(
    filters,
    Number(page),
    Number(limit)
  );

  res.json({
    success: true,
    data: result.items,
    pagination: result.meta,
  });
});

/**
 * @swagger
 * /foods/{id}:
 *   get:
 *     summary: Get food by ID [PUBLIC]
 *     description: Public endpoint - No authentication required. Get detailed information about a specific food.
 *     tags: [Foods]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Food ID
 *     responses:
 *       200:
 *         description: Food details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/FoodItem'
 *       404:
 *         description: Food not found
 */
const getFoodById = asyncHandler(async (req, res) => {
  const food = await foodService.getFoodById(req.params.id);

  if (!food) {
    return res.status(404).json({
      success: false,
      message: "Food not found",
    });
  }

  res.json({
    success: true,
    data: food,
  });
});

/**
 * @swagger
 * /foods:
 *   post:
 *     summary: Create a new food item [ADMIN ONLY]
 *     description: Requires admin role. Create a new food item in the database.
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - nutrientsPerHundred
 *               - portionSizes
 *             properties:
 *               name:
 *                 type: string
 *               altNames:
 *                 type: array
 *                 items:
 *                   type: string
 *               nutrientsPerHundred:
 *                 type: object
 *               portionSizes:
 *                 type: array
 *               glycemicIndex:
 *                 type: number
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isVegetarian:
 *                 type: boolean
 *               affordability:
 *                 type: number
 *               imageUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Food created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/FoodItem'
 *       400:
 *         description: Invalid input
 */
const createFood = asyncHandler(async (req, res) => {
  const food = await foodService.createFood(req.body);

  res.status(201).json({
    success: true,
    message: "Food created successfully",
    data: food,
  });
});

/**
 * @swagger
 * /foods/{id}:
 *   put:
 *     summary: Update a food item [ADMIN ONLY]
 *     description: Requires admin role. Update an existing food item.
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Food ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               altNames:
 *                 type: array
 *               nutrientsPerHundred:
 *                 type: object
 *               portionSizes:
 *                 type: array
 *               glycemicIndex:
 *                 type: number
 *               tags:
 *                 type: array
 *               isVegetarian:
 *                 type: boolean
 *               affordability:
 *                 type: number
 *               imageUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Food updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/FoodItem'
 *       404:
 *         description: Food not found
 */
const updateFood = asyncHandler(async (req, res) => {
  const food = await foodService.updateFood(req.params.id, req.body);

  if (!food) {
    return res.status(404).json({
      success: false,
      message: "Food not found",
    });
  }

  res.json({
    success: true,
    message: "Food updated successfully",
    data: food,
  });
});

/**
 * @swagger
 * /foods/batch:
 *   post:
 *     summary: Batch create or update foods [ADMIN ONLY]
 *     description: Requires admin role. Batch upload multiple food items at once.
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - foods
 *             properties:
 *               foods:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Batch operation completed
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
 *                     created:
 *                       type: number
 *                     updated:
 *                       type: number
 *                     total:
 *                       type: number
 */
const batchUpsertFoods = asyncHandler(async (req, res) => {
  const { foods } = req.body;

  if (!Array.isArray(foods) || foods.length === 0) {
    return res.status(400).json({
      success: false,
      message: "foods array is required and must not be empty",
    });
  }

  const result = await foodService.batchUpsertFoods(foods);

  res.json({
    success: true,
    message: "Batch operation completed",
    stats: result,
  });
});

/**
 * @swagger
 * /foods/{id}:
 *   delete:
 *     summary: Delete a food item [ADMIN ONLY]
 *     description: Requires admin role. Soft-delete a food item from the database.
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Food ID
 *     responses:
 *       200:
 *         description: Food deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Food not found
 */
const deleteFood = asyncHandler(async (req, res) => {
  await foodService.deleteFood(req.params.id, req.user._id);

  res.json({
    success: true,
    message: "Food deleted successfully",
  });
});

module.exports = {
  getAllFoods,
  getFoodById,
  createFood,
  updateFood,
  batchUpsertFoods,
  deleteFood,
};
