const mongoose = require("mongoose");

const accountDeletionEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
    },
    at: {
      type: Date,
      default: Date.now,
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: false }
);

const accountDeletionRequestSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "verification_sent",
        "pending_admin_review",
        "approved_scheduled",
        "completed",
        "cancelled",
        "expired",
      ],
      default: "verification_sent",
      index: true,
    },
    verificationCodeHash: String,
    verificationExpiresAt: Date,
    verificationAttempts: {
      type: Number,
      default: 0,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    verifiedAt: Date,
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    scheduleOption: {
      type: String,
      enum: ["immediate", "15_days", "30_days"],
    },
    scheduledDeletionAt: {
      type: Date,
      index: true,
    },
    completedAt: Date,
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancellationReason: String,
    adminNotes: String,
    dataSummary: {
      deleted: {
        type: [String],
        default: [
          "Account credentials and profile data",
          "Meal logs and nutrition history",
          "Glucose logs and symptom notes",
          "AI chat conversations",
          "Device tokens and app notifications",
          "Offline sync checkpoints",
        ],
      },
      retained: {
        type: [String],
        default: [
          "Audit logs and deletion request records retained for 90 days after completion or cancellation",
        ],
      },
    },
    events: {
      type: [accountDeletionEventSchema],
      default: [],
    },
  },
  { timestamps: true }
);

accountDeletionRequestSchema.index({ email: 1, status: 1, createdAt: -1 });
accountDeletionRequestSchema.index({ status: 1, scheduledDeletionAt: 1 });

module.exports = mongoose.model(
  "AccountDeletionRequest",
  accountDeletionRequestSchema
);
