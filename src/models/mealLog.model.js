const mongoose = require("mongoose");

const mealEntrySchema = new mongoose.Schema(
  {
    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodItem",
      required: true,
    },
    localName: String,
    canonicalName: String,
    category: String,
    portionName: String,
    portionSize: String,
    grams: {
      type: Number,
      default: 0,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    carbs_g: Number,
  },
  { _id: false }
);

const mealLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    mealType: {
      type: String,
      enum: ["breakfast", "lunch", "dinner", "snack"],
      default: "snack",
    },
    entries: [mealEntrySchema],
    calculatedTotals: {
      calories: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      fibre: { type: Number, default: 0 },
    },
    notes: String,
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    clientGeneratedId: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
mealLogSchema.index({ userId: 1, createdAt: -1 });
mealLogSchema.index({ userId: 1, timestamp: -1 });
mealLogSchema.index(
  { userId: 1, clientGeneratedId: 1 },
  { unique: true, sparse: false }
);

const MealLog = mongoose.model("MealLog", mealLogSchema);

module.exports = MealLog;
