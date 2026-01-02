const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
const config = require("./config");
const {
  errorHandler,
  notFoundHandler,
  logger,
} = require("./middlewares/error.middleware");
const { generalLimiter } = require("./middlewares/rateLimit.middleware");
const swaggerAuth = require("./middlewares/swaggerAuth.middleware");

// Import routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const foodRoutes = require("./routes/food.routes");
const ruleRoutes = require("./routes/rule.routes");
const syncRoutes = require("./routes/sync.routes");
const adminRoutes = require("./routes/admin.routes");
const reportRoutes = require("./routes/report.routes");

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

// Enhanced request logging for debugging mobile app
app.use((req, res, next) => {
  const startTime = Date.now();

  // Log incoming request
  console.log("\n" + "=".repeat(80));
  console.log(
    `📱 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`
  );
  console.log(`🌐 Origin: ${req.headers.origin || "No origin"}`);
  console.log(`📍 IP: ${req.ip || req.connection.remoteAddress}`);

  if (req.body && Object.keys(req.body).length > 0) {
    console.log("📦 Request Body:", JSON.stringify(req.body, null, 2));
  }

  if (req.query && Object.keys(req.query).length > 0) {
    console.log("🔍 Query Params:", req.query);
  }

  if (req.headers.authorization) {
    console.log("🔑 Auth: Bearer token present");
  }

  // Log response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;
    console.log(`⏱️  Response Time: ${duration}ms`);
    console.log(`📤 Status: ${res.statusCode}`);

    if (res.statusCode >= 400) {
      console.log("❌ Error Response:", data);
    } else {
      console.log("✅ Success");
      // Parse and show response body for successful requests
      try {
        const responseBody = typeof data === "string" ? JSON.parse(data) : data;
        console.log("📨 Response Body:", JSON.stringify(responseBody, null, 2));
      } catch (e) {
        // If not JSON, show raw data (truncated if too long)
        const dataStr = String(data);
        console.log(
          "📨 Response:",
          dataStr.length > 500 ? dataStr.substring(0, 500) + "..." : dataStr
        );
      }
    }
    console.log("=".repeat(80) + "\n");

    originalSend.call(this, data);
  };

  logger.info(
    {
      method: req.method,
      url: req.url,
      userId: req.userId,
    },
    "Incoming request"
  );
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
});

// API routes
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/foods", foodRoutes);
app.use("/rules", ruleRoutes);
app.use("/sync", syncRoutes);
app.use("/admin", adminRoutes);
app.use("/reports", reportRoutes);

// Swagger documentation (will be configured separately)
const swaggerSetup = require("./docs/swagger");
app.use("/api-docs", swaggerAuth, swaggerSetup.serve, swaggerSetup.setup);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

module.exports = app;
