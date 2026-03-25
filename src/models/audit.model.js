const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    who: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    target: {
      collection: String,
      id: mongoose.Schema.Types.ObjectId,
    },
    payload: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
auditSchema.index({ createdAt: -1 });
auditSchema.index({ action: 1, createdAt: -1 });
auditSchema.index({ who: 1, createdAt: -1 });
auditSchema.index({ 'target.collection': 1, 'target.id': 1 });

const Audit = mongoose.model('Audit', auditSchema);

module.exports = Audit;
