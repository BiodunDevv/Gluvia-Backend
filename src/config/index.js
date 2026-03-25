const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config();

const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.APP_PORT, 10) || 3000,

  // MongoDB
  mongo: {
    uri: process.env.MONGO_URI || "mongodb://localhost:27017/gluvia",
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY || "30d",
  },

  // Cloudinary
  cloudinary: {
    cloud: process.env.CLOUDINARY_CLOUD,
    key: process.env.CLOUDINARY_KEY,
    secret: process.env.CLOUDINARY_SECRET,
  },

  // Brevo
  brevo: {
    apiKey: process.env.BREVO_API_KEY,
    fromEmail: process.env.FROM_EMAIL || "noreply@gluvia.ai",
    fromName: process.env.FROM_NAME || "Gluvia AI",
  },

  // Admin
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    baseUrl:
      process.env.GROQ_BASE_URL ||
      "https://api.groq.com/openai/v1/chat/completions",
  },

  azureTranslator: {
    apiKey:
      process.env.AZURE_TRANSLATOR_API_KEY ||
      process.env.EXPO_PUBLIC_TRANSLATOR_API_KEY,
    endpoint:
      process.env.AZURE_TRANSLATOR_ENDPOINT ||
      process.env.EXPO_PUBLIC_TRANSLATOR_ENDPOINT,
    region:
      process.env.AZURE_TRANSLATOR_REGION ||
      process.env.EXPO_PUBLIC_TRANSLATOR_REGION,
  },

  expo: {
    pushUrl:
      process.env.EXPO_PUSH_URL || "https://exp.host/--/api/v2/push/send",
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },

  heartbeat: {
    enabled:
      String(process.env.HEARTBEAT_ENABLED || "true").toLowerCase() !== "false",
    intervalMs: parseInt(process.env.HEARTBEAT_INTERVAL_MS, 10) || 5 * 60 * 1000,
  },

  maintenanceMode: process.env.MAINTENANCE_MODE || "false",

  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

  // Swagger
  swagger: {
    username: process.env.SWAGGER_USERNAME,
    password: process.env.SWAGGER_PASSWORD,
  },

  // Google APIs
  google: {
    geminiApiKey: process.env.GOOGLE_GEMINI_API_KEY,
    customSearchApiKey: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
    customSearchEngineId: process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID,
  },
};

// Validate required config
const requiredEnvVars = ["JWT_SECRET"];

if (config.env === "production") {
  requiredEnvVars.push(
    "MONGO_URI",
    "CLOUDINARY_CLOUD",
    "CLOUDINARY_KEY",
    "CLOUDINARY_SECRET",
    "BREVO_API_KEY"
  );
}

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingVars.join(", ")}`
  );
  if (config.env === "production") {
    process.exit(1);
  }
}

module.exports = config;
