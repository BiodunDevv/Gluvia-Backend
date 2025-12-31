const mongoose = require('mongoose');

const glucoseLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    valueMgDl: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['fasting', 'postprandial', 'random'],
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
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
glucoseLogSchema.index({ userId: 1, timestamp: -1 });

const GlucoseLog = mongoose.model('GlucoseLog', glucoseLogSchema);

module.exports = GlucoseLog;
