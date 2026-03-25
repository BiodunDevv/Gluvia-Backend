const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
const config = require("./config");
const {
  errorHandler,
  notFoundHandler,
} = require("./middlewares/error.middleware");
const { generalLimiter } = require("./middlewares/rateLimit.middleware");
const swaggerAuth = require("./middlewares/swaggerAuth.middleware");
const { maintenanceGuard } = require("./middlewares/maintenance.middleware");
const { optionalAuth } = require("./middlewares/auth.middleware");

// Import routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const foodRoutes = require("./routes/food.routes");
const ruleRoutes = require("./routes/rule.routes");
const syncRoutes = require("./routes/sync.routes");
const adminRoutes = require("./routes/admin.routes");
const reportRoutes = require("./routes/report.routes");
const notificationRoutes = require("./routes/notification.routes");
const { getMaintenanceSettings } = require("./services/settings.service");

// Initialize express app
const app = express();

// Security middleware
app.use(helmet());

// CORS - Allow all origins (including Expo mobile app)
app.use(
  cors({
    origin: true, // Allow all origins with credentials
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Sanitize data
app.use(mongoSanitize());

// Rate limiting
app.use(generalLimiter);

// Request timing hook without terminal request logging
app.use((req, res, next) => {
  next();
});

// Health check
app.get("/health", async (req, res) => {
  const maintenance = await getMaintenanceSettings(config.maintenanceMode);
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: config.env,
    maintenanceMode: maintenance.enabled,
    maintenanceMessage: maintenance.message,
  });
});

app.use(optionalAuth);
app.use(maintenanceGuard);

// API routes
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/foods", foodRoutes);
app.use("/rules", ruleRoutes);
app.use("/sync", syncRoutes);
app.use("/admin", adminRoutes);
app.use("/reports", reportRoutes);
app.use("/notifications", notificationRoutes);

// Swagger documentation (will be configured separately)
const swaggerSetup = require("./docs/swagger");
app.use("/api-docs", swaggerAuth, swaggerSetup.serve, swaggerSetup.setup);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

module.exports = app;
