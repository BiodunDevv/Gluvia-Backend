const mongoose = require("mongoose");

const revokedTokenSchema = new mongoose.Schema(
  {
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      default: "logout",
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically delete expired tokens
revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
revokedTokenSchema.index({ userId: 1, createdAt: -1 });

const RevokedToken = mongoose.model("RevokedToken", revokedTokenSchema);

module.exports = RevokedToken;
