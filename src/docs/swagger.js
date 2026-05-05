const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const config = require("../config");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Gluvia AI API",
      version: "1.0.0",
      description:
        "Production-ready Express.js backend for Gluvia AI - Offline-first diabetic meal guidance",
      contact: {
        name: "Gluvia AI Team",
        email: config.admin.email,
      },
    },
    servers: [
      {
        url:
          config.env === "production"
            ? "https://api.gluvia.ai"
            : `http://localhost:${config.port}`,
        description: config.env === "production" ? "Production" : "Development",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                details: { type: "array", items: { type: "object" } },
              },
            },
          },
        },
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            email: { type: "string" },
            name: { type: "string" },
            role: { type: "string", enum: ["user", "admin"] },
            profile: { type: "object" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        FoodItem: {
          type: "object",
          properties: {
            _id: { type: "string" },
            localName: { type: "string" },
            category: { type: "string" },
            nutrients: {
              type: "object",
              properties: {
                calories: { type: "number" },
                carbs_g: { type: "number" },
                protein_g: { type: "number" },
                fat_g: { type: "number" },
                fibre_g: { type: "number" },
                gi: { type: "number", nullable: true },
              },
            },
            version: { type: "number" },
          },
        },
        RuleTemplate: {
          type: "object",
          properties: {
            _id: { type: "string" },
            slug: { type: "string" },
            title: { type: "string" },
            type: { type: "string" },
            definition: { type: "object" },
            version: { type: "number" },
          },
        },
        AccountDeletionRequest: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string" },
            status: {
              type: "string",
              enum: [
                "verification_sent",
                "pending_admin_review",
                "approved_scheduled",
                "completed",
                "cancelled",
                "expired",
              ],
            },
            scheduleOption: {
              type: "string",
              enum: ["immediate", "15_days", "30_days"],
            },
            requestedAt: { type: "string", format: "date-time" },
            scheduledDeletionAt: { type: "string", format: "date-time" },
            completedAt: { type: "string", format: "date-time" },
            cancelledAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    security: [],
    tags: [
      {
        name: "Auth",
        description: "Authentication and user profile endpoints",
      },
      { name: "User", description: "User profile management endpoints" },
      { name: "Foods", description: "Food database operations" },
      { name: "Rules", description: "Rule template management" },
      { name: "Sync", description: "Offline sync endpoints" },
      { name: "Reports", description: "Reports and analytics" },
      { name: "Privacy", description: "Privacy and account deletion requests" },
      {
        name: "Admin",
        description: "Admin-only operations (requires admin role)",
      },
    ],
  },
  apis: ["./src/controllers/*.js"],
};

const specs = swaggerJsdoc(options);

module.exports = {
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    swaggerOptions: {
      tagsSorter: "alpha",
      operationsSorter: "alpha",
    },
  }),
  specs,
};
