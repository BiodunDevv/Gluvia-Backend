const FoodItem = require("../models/food.model");
const Config = require("../models/config.model");
const auditService = require("./audit.service");

/**
 * Get server version from config
 */
const getServerVersion = async () => {
  const config = await Config.findOne({ key: "serverVersion" })
    .select("value")
    .lean();
  return config ? config.value : 0;
};

/**
 * Increment server version
 */
const incrementServerVersion = async () => {
  const config = await Config.findOneAndUpdate(
    { key: "serverVersion" },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return config.value;
};

/**
 * Search foods with filters
 */
const searchFoods = async (filters, page = 1, limit = 20) => {
  const query = { deleted: false };
  let sortOption = { localName: 1 };

  // Text search with fallback to regex
  if (filters.search) {
    const searchTerm = filters.search.trim();

    // Try text search first (requires text index)
    const textSearchQuery = {
      ...query,
      $text: { $search: searchTerm },
    };

    const textSearchCount = await FoodItem.countDocuments(textSearchQuery);

    if (textSearchCount > 0) {
      // Use text search if results found
      query.$text = { $search: searchTerm };
      sortOption = { score: { $meta: "textScore" } };
    } else {
      // Fallback to regex search for partial matches
      const searchRegex = new RegExp(searchTerm, "i");
      query.$or = [
        { localName: searchRegex },
        { canonicalName: searchRegex },
        { tags: searchRegex },
        { category: searchRegex },
      ];
    }
  }

  // Category filter
  if (filters.category) {
    query.category = new RegExp(`^${filters.category}$`, "i");
  }

  // GI range filter
  if (filters.gi_min || filters.gi_max) {
    query["nutrients.gi"] = {};
    if (filters.gi_min) query["nutrients.gi"].$gte = parseFloat(filters.gi_min);
    if (filters.gi_max) query["nutrients.gi"].$lte = parseFloat(filters.gi_max);
  }

  // Affordability filter
  if (filters.affordability) {
    query.affordability = filters.affordability.toLowerCase();
  }

  // Tags filter - supports multiple tags
  if (filters.tags) {
    const tagsArray = Array.isArray(filters.tags)
      ? filters.tags
      : [filters.tags];
    query.tags = { $in: tagsArray.map((tag) => new RegExp(`^${tag}$`, "i")) };
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    FoodItem.find(query)
      .select("-__v -images")
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
    FoodItem.countDocuments(query),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + items.length < total,
    },
  };
};

/**
 * Get food by ID
 */
const getFoodById = async (id) => {
  const food = await FoodItem.findOne({ _id: id, deleted: false })
    .select("-__v -images")
    .lean();
  if (!food) {
    throw new Error("Food not found");
  }
  return food;
};

/**
 * Create new food (admin)
 */
const createFood = async (foodData, userId) => {
  // Check if food already exists by localName or canonicalName
  const existingFood = await FoodItem.findOne({
    $or: [
      { localName: new RegExp(`^${foodData.localName}$`, "i") },
      {
        canonicalName: foodData.canonicalName
          ? new RegExp(`^${foodData.canonicalName}$`, "i")
          : null,
      },
    ].filter(Boolean),
    deleted: false,
  });

  if (existingFood) {
    throw new Error(`Food already exists: ${existingFood.localName}`);
  }

  const food = await FoodItem.create({
    ...foodData,
    version: 1,
  });

  // Convert to plain object and remove unwanted fields
  const foodObject = food.toObject({ getters: true, virtuals: false });

  delete foodObject.__v;
  if (foodObject.images !== undefined) {
    delete foodObject.images;
  }

  // Increment server version
  const serverVersion = await incrementServerVersion();

  // Audit log
  await auditService.logAudit({
    action: "food_created",
    who: userId,
    target: { collection: "foods", id: food._id },
    payload: foodData,
  });

  return { food: foodObject, serverVersion };
};

/**
 * Update food (admin)
 */
const updateFood = async (id, foodData, userId) => {
  const existingFood = await FoodItem.findOne({ _id: id, deleted: false });
  if (!existingFood) {
    throw new Error("Food not found");
  }

  // Check version conflict
  if (foodData.version && foodData.version !== existingFood.version) {
    throw new Error("Version conflict - food has been modified");
  }

  // Remove _id and version from foodData to avoid conflicts
  const { _id, version, ...updateData } = foodData;

  // Use findOneAndUpdate for reliable field updates
  const food = await FoodItem.findOneAndUpdate(
    { _id: id, deleted: false },
    {
      $set: updateData,
      $inc: { version: 1 },
    },
    { new: true, runValidators: true }
  );

  // Convert to plain object and remove unwanted fields
  const foodObject = food.toObject();
  delete foodObject.__v;
  delete foodObject.images;

  // Increment server version
  const serverVersion = await incrementServerVersion();

  // Audit log
  await auditService.logAudit({
    action: "food_updated",
    who: userId,
    target: { collection: "foods", id: food._id },
    payload: foodData,
  });

  return { food: foodObject, serverVersion };
};

/**
 * Delete food (admin) - soft delete
 */
const deleteFood = async (id, userId) => {
  const food = await FoodItem.findById(id);
  if (!food) {
    throw new Error("Food not found");
  }

  food.deleted = true;
  food.version += 1;
  await food.save();

  // Increment server version
  const serverVersion = await incrementServerVersion();

  // Audit log
  await auditService.logAudit({
    action: "food_deleted",
    who: userId,
    target: { collection: "foods", id: food._id },
  });

  return { ok: true, serverVersion };
};

/**
 * Batch create/update foods (admin)
 */
const batchUpsertFoods = async (items, userId) => {
  const results = [];
  let successCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < items.length; i++) {
    try {
      const item = items[i];

      if (item._id) {
        // Update existing
        const { food } = await updateFood(item._id, item, userId);
        results.push({ index: i, success: true, food, action: "updated" });
        successCount++;
      } else {
        // Check if food already exists before creating
        const existingFood = await FoodItem.findOne({
          $or: [
            { localName: new RegExp(`^${item.localName}$`, "i") },
            {
              canonicalName: item.canonicalName
                ? new RegExp(`^${item.canonicalName}$`, "i")
                : null,
            },
          ].filter(Boolean),
          deleted: false,
        });

        if (existingFood) {
          results.push({
            index: i,
            success: false,
            error: `Food already exists: ${existingFood.localName}`,
            action: "skipped",
          });
          skippedCount++;
        } else {
          // Create new
          const { food } = await createFood(item, userId);
          results.push({ index: i, success: true, food, action: "created" });
          successCount++;
        }
      }
    } catch (error) {
      results.push({
        index: i,
        success: false,
        error: error.message,
        action: "failed",
      });
    }
  }

  // Get final server version
  const serverVersion = await getServerVersion();

  return {
    results,
    successCount,
    skippedCount,
    totalCount: items.length,
    serverVersion,
  };
};

/**
 * Get foods changed since version
 */
const getFoodsChangedSince = async (clientVersion = 0) => {
  const foods = await FoodItem.find({
    version: { $gt: clientVersion },
  })
    .select("-__v -images")
    .lean();

  // Include deleted items as tombstones
  const foodsWithTombstones = foods.map((food) => {
    if (food.deleted) {
      return {
        _id: food._id,
        deleted: true,
        deletedAt: food.updatedAt,
        version: food.version,
      };
    }
    return food;
  });

  return foodsWithTombstones;
};

module.exports = {
  getServerVersion,
  incrementServerVersion,
  searchFoods,
  getFoodById,
  createFood,
  updateFood,
  deleteFood,
  batchUpsertFoods,
  getFoodsChangedSince,
};
