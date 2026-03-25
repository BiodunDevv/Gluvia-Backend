const mongoose = require('mongoose');

const ruleTemplateSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['constraint', 'scoring', 'substitution', 'portion_adjustment', 'alert'],
      required: true,
    },
    definition: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    nlTemplate: {
      type: String,
      trim: true,
    },
    version: {
      type: Number,
      default: 1,
      index: true,
    },
    appliesTo: [String],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

// Compound index
ruleTemplateSchema.index({ slug: 1, version: -1 });
ruleTemplateSchema.index({ deleted: 1, updatedAt: -1 });
ruleTemplateSchema.index({ deleted: 1, version: -1 });

const RuleTemplate = mongoose.model('RuleTemplate', ruleTemplateSchema);

module.exports = RuleTemplate;
