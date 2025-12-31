const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const config = require('./config');
const { errorHandler, notFoundHandler, logger } = require('./middlewares/error.middleware');
const { generalLimiter } = require('./middlewares/rateLimit.middleware');
const swaggerAuth = require('./middlewares/swaggerAuth.middleware');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const foodRoutes = require('./routes/food.routes');
const ruleRoutes = require('./routes/rule.routes');
const syncRoutes = require('./routes/sync.routes');
const adminRoutes = require('./routes/admin.routes');
const reportRoutes = require('./routes/report.routes');

// Initialize express app
const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: config.env === 'production' 
    ? [config.frontendUrl] 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:19000'], // Allow local dev and Expo
  credentials: true,
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize data
app.use(mongoSanitize());

// Rate limiting
app.use(generalLimiter);

// Request logging
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    userId: req.userId,
  }, 'Incoming request');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
});

// API routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/foods', foodRoutes);
app.use('/rules', ruleRoutes);
app.use('/sync', syncRoutes);
app.use('/admin', adminRoutes);
app.use('/reports', reportRoutes);

// Swagger documentation (will be configured separately)
const swaggerSetup = require('./docs/swagger');
app.use('/api-docs', swaggerAuth, swaggerSetup.serve, swaggerSetup.setup);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

module.exports = app;
