const mongoose = require('mongoose');

const mealEntrySchema = new mongoose.Schema({
  foodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodItem',
    required: true,
  },
  portionName: String,
  grams: {
    type: Number,
    required: true,
  },
  carbs_g: Number,
}, { _id: false });

const mealLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    entries: [mealEntrySchema],
    calculatedTotals: {
      calories: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      fibre: { type: Number, default: 0 },
    },
    clientGeneratedId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
mealLogSchema.index({ userId: 1, createdAt: -1 });

const MealLog = mongoose.model('MealLog', mealLogSchema);

module.exports = MealLog;
