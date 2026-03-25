const mongoose = require("mongoose");

const aiMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      default: "groq",
    },
    safeFallbackUsed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const aiConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    messages: {
      type: [aiMessageSchema],
      default: [],
    },
    lastMessage: {
      type: String,
      trim: true,
      maxlength: 60000,
    },
  },
  {
    timestamps: true,
  }
);

aiConversationSchema.index({ userId: 1, updatedAt: -1 });
aiConversationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("AIConversation", aiConversationSchema);
