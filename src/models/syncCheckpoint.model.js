const mongoose = require('mongoose');

const syncCheckpointSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    clientVersion: {
      type: Number,
      default: 0,
    },
    serverVersion: {
      type: Number,
      default: 0,
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const SyncCheckpoint = mongoose.model('SyncCheckpoint', syncCheckpointSchema);

module.exports = SyncCheckpoint;
