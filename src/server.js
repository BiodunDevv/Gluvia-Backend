const mongoose = require("mongoose");
const app = require("./app");
const config = require("./config");
const { logger } = require("./middlewares/error.middleware");
const { startHeartbeat, stopHeartbeat } = require("./services/heartbeat.service");
const os = require("os");

// Get local IP address
const getLocalIPAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
};

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
  startHeartbeat();

  const server = app.listen(config.port, () => {
    const localIP = getLocalIPAddress();

    console.log("\n" + "=".repeat(70));
    console.log("🚀 GLUVIA BACKEND SERVER STARTED");
    console.log("=".repeat(70));

    logger.info(`Environment: ${config.env}`);
    logger.info(`Port: ${config.port}`);

    console.log("\n📱 REACT NATIVE / EXPO DEVELOPMENT:");
    console.log(`   Use this URL in your mobile app:`);
    console.log(`   → http://${localIP}:${config.port}`);
    console.log(`\n   Example API configuration:`);
    console.log(`   const API_BASE_URL = "http://${localIP}:${config.port}";`);

    console.log("\n🌐 WEB DEVELOPMENT:");
    console.log(`   → http://localhost:${config.port}`);

    console.log("\n📚 API DOCUMENTATION:");
    console.log(`   → http://localhost:${config.port}/api-docs`);
    console.log(`   → http://${localIP}:${config.port}/api-docs (mobile)`);

    console.log("\n✅ HEALTH CHECK:");
    console.log(`   → http://localhost:${config.port}/health`);
    console.log(`   → http://${localIP}:${config.port}/health (mobile)`);

    console.log("\n" + "=".repeat(70) + "\n");
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received, closing server gracefully`);

    server.close(async () => {
      logger.info("HTTP server closed");
      stopHeartbeat();

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
