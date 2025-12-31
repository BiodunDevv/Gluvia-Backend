const mongoose = require('mongoose');

const configSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

const Config = mongoose.model('Config', configSchema);

module.exports = Config;
