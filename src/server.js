const mongoose = require("mongoose");
const app = require("./app");
const config = require("./config");
const { logger } = require("./middlewares/error.middleware");

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongo.uri);
    logger.info("MongoDB connected successfully");
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await connectDB();

  const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} in ${config.env} mode`);
    logger.info(`API Documentation: http://localhost:${config.port}/api-docs`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received, closing server gracefully`);

    server.close(async () => {
      logger.info("HTTP server closed");

      try {
        await mongoose.connection.close();
        logger.info("MongoDB connection closed");
        process.exit(0);
      } catch (error) {
        logger.error("Error during graceful shutdown:", error);
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error("Forced shutdown due to timeout");
      process.exit(1);
    }, 30000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
};

// Start the server
startServer().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});
