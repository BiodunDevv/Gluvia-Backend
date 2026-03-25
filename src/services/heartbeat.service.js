const mongoose = require("mongoose");
const { logger } = require("../middlewares/error.middleware");
const config = require("../config");

let heartbeatInterval = null;

const runHeartbeat = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
    }
  } catch (error) {
    logger.error({ err: error }, "Background heartbeat failed");
  }
};

const startHeartbeat = () => {
  if (!config.heartbeat.enabled || heartbeatInterval) {
    return;
  }

  heartbeatInterval = setInterval(runHeartbeat, config.heartbeat.intervalMs);

  if (typeof heartbeatInterval.unref === "function") {
    heartbeatInterval.unref();
  }

  logger.info(
    { intervalMs: config.heartbeat.intervalMs },
    "Background heartbeat started"
  );
};

const stopHeartbeat = () => {
  if (!heartbeatInterval) {
    return;
  }

  clearInterval(heartbeatInterval);
  heartbeatInterval = null;
};

module.exports = {
  startHeartbeat,
  stopHeartbeat,
};
