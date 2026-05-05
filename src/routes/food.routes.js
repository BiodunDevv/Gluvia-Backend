const express = require("express");
const router = express.Router();
const foodController = require("../controllers/food.controller");
const {
  authenticate,
  optionalAuth,
} = require("../middlewares/auth.middleware");
const { requireAdmin } = require("../middlewares/role.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { createFoodSchema, updateFoodSchema } = require("../utils/validators");

// Public routes (no auth required)
router.get("/", foodController.getAllFoods);
router.get("/:id", foodController.getFoodById);

// Authenticated routes
router.post("/search-image", authenticate, foodController.searchFoodImage);
router.post("/ai-generate", authenticate, foodController.aiGenerateFood);

// Admin routes
router.post(
  "/",
  authenticate,
  requireAdmin,
  validate(createFoodSchema),
  foodController.createFood
);
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  validate(updateFoodSchema),
  foodController.updateFood
);
router.delete("/:id", authenticate, requireAdmin, foodController.deleteFood);
router.post(
  "/batch",
  authenticate,
  requireAdmin,
  foodController.batchUpsertFoods
);

module.exports = router;
