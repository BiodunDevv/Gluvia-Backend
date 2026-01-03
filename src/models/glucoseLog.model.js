const mongoose = require("mongoose");

const glucoseLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    valueMgDl: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      enum: ["mg/dL", "mmol/L"],
      default: "mg/dL",
    },
    type: {
      type: String,
      enum: [
        "fasting",
        "before_meal",
        "after_meal",
        "bedtime",
        "random",
        "2hr_post_meal",
        "postprandial",
      ],
      required: true,
    },
    clientGeneratedId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: String,
    mealRelated: {
      type: Boolean,
      default: false,
    },
    mealLogId: {
      type: String,
    },
    symptoms: [
      {
        type: String,
        enum: [
          "dizzy",
          "shaky",
          "sweaty",
          "tired",
          "hungry",
          "thirsty",
          "blurred_vision",
          "none",
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
glucoseLogSchema.index({ userId: 1, timestamp: -1 });

const GlucoseLog = mongoose.model("GlucoseLog", glucoseLogSchema);

module.exports = GlucoseLog;
