const mongoose = require("mongoose");

const portionSizeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    grams: { type: Number, required: true },
    carbs_g: Number,
  },
  { _id: false }
);

const regionVariantSchema = new mongoose.Schema(
  {
    region: String,
    note: String,
  },
  { _id: false }
);

const foodItemSchema = new mongoose.Schema(
  {
    localName: {
      type: String,
      required: true,
      trim: true,
    },
    canonicalName: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      index: true,
    },
    nutrients: {
      calories: { type: Number, default: 0 },
      carbs_g: { type: Number, default: 0 },
      protein_g: { type: Number, default: 0 },
      fat_g: { type: Number, default: 0 },
      fibre_g: { type: Number, default: 0 },
      gi: { type: Number, default: null },
    },
    portionSizes: [portionSizeSchema],
    affordability: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    tags: [String],
    imageUrl: {
      type: String,
      trim: true,
    },
    regionVariants: [regionVariantSchema],
    source: {
      type: String,
      enum: ["manual", "validated", "estimated"],
      default: "manual",
    },
    version: {
      type: Number,
      default: 1,
      index: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Text index for search
foodItemSchema.index({
  localName: "text",
  canonicalName: "text",
  tags: "text",
});

// Compound indexes
foodItemSchema.index({ deleted: 1, category: 1 });
foodItemSchema.index({ deleted: 1, localName: 1 });
foodItemSchema.index({ deleted: 1, version: -1 });
foodItemSchema.index({ version: -1 });

const FoodItem = mongoose.model("FoodItem", foodItemSchema);

module.exports = FoodItem;
