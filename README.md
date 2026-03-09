# Gluvia AI Backend

Production-ready Express.js backend for Gluvia AI - An offline-first diabetic meal guidance platform.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database Models](#database-models)
- [Sync Protocol](#sync-protocol)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Structure](#project-structure)

## 🎯 Overview

Gluvia AI Backend is a secure, scalable REST API that powers an offline-first mobile application for personalized diabetic meal guidance. The backend manages user authentication, food database, rule templates, and provides versioned sync endpoints for mobile clients.

## ✨ Features

- **JWT Authentication** with single-token session model and token revocation
- **Role-Based Access Control** (user, admin)
- **Food Database** with 50+ Nigerian/African foods, nutritional data, and GI values
- **Rule Engine Templates** for client-side reasoning (carb limits, GI warnings, portion adjustments)
- **Offline-First Sync** with delta updates and version control
- **Image Upload** via Cloudinary
- **Email Service** via Brevo (welcome, password reset, notifications)
- **Audit Logging** for admin actions
- **Rate Limiting** and security middleware
- **Swagger Documentation** at `/api-docs`
- **NDPR Compliance** with data export and account deletion

## 🛠 Tech Stack

- **Runtime:** Node.js 18+ LTS
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JWT + bcrypt
- **Validation:** Zod
- **Image Storage:** Cloudinary
- **Email:** Brevo (Sendinblue)
- **Documentation:** Swagger (swagger-jsdoc + swagger-ui-express)
- **Logging:** Pino
- **Testing:** Jest + Supertest

## 📦 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB (local or Atlas)
- Cloudinary account
- Brevo API key

## 🚀 Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd "Gluvia Backend"
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and configure all required variables (see [Configuration](#configuration)).

4. **Seed the database:**
```bash
npm run seed:initial
```

This will:
- Create an admin user
- Seed 50 food items
- Seed 10 rule templates
- Initialize serverVersion to 1

**⚠️ IMPORTANT:** After seeding, change the default admin password immediately!

## ⚙️ Configuration

### Required Environment Variables

```env
# Server
NODE_ENV=development
APP_PORT=3000

# MongoDB
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/gluvia?retryWrites=true&w=majority

# JWT (Generate a strong 32+ character secret)
JWT_SECRET=your_strong_random_secret_min_32_chars
JWT_EXPIRY=30d

# Cloudinary
CLOUDINARY_CLOUD=your_cloud_name
CLOUDINARY_KEY=your_api_key
CLOUDINARY_SECRET=your_api_secret

# Brevo Email Service
BREVO_API_KEY=your_brevo_api_key
FROM_EMAIL=noreply@gluvia.ai
FROM_NAME=Gluvia AI

# Admin
ADMIN_EMAIL=admin@gluvia.ai
ADMIN_PASSWORD=ChangeThisPassword123!

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:3000
```

### Optional Variables

```env
# Swagger Protection (recommended for production)
SWAGGER_USERNAME=admin
SWAGGER_PASSWORD=secure_password
```

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

Server runs on `http://localhost:3000` with hot-reload via nodemon.

### Production Mode

```bash
npm start
```

### Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run seed:initial` - Seed initial data (admin, foods, rules)
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 📚 API Documentation

Interactive API documentation is available at:

**`http://localhost:3000/api-docs`**

### Key Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout (revoke token)
- `POST /auth/password-reset-request` - Request password reset
- `POST /auth/password-reset` - Reset password

#### User
- `GET /user/me` - Get current user profile
- `PUT /user/me` - Update user profile
- `POST /user/upload-photo` - Upload profile photo
- `GET /user/export` - Export user data (NDPR)
- `DELETE /user` - Delete account

#### Foods
- `GET /foods` - Search/list foods (with filters)
- `GET /foods/:id` - Get food by ID
- `POST /admin/foods` - Create food (admin)
- `PUT /admin/foods/:id` - Update food (admin)
- `POST /admin/foods/batch` - Batch upload foods (admin)

#### Rules
- `GET /rules` - Get all rule templates
- `GET /rules/:slug` - Get rule by slug
- `POST /admin/rules` - Create rule (admin)
- `PUT /admin/rules/:slug` - Update rule (admin)

#### Sync (Offline Support)
- `POST /sync/upload` - Upload logs from client
- `GET /sync/updates?clientVersion=X` - Get delta updates
- `GET /sync/full` - Full sync (first-time or force)

#### Admin
- `POST /admin/seed-initial` - Re-run seed (idempotent)
- `POST /admin/revoke-user-tokens` - Revoke all user tokens
- `GET /admin/audit` - Get audit logs

#### Reports
- `GET /reports/user/:id/nutrition` - User nutrition reports

## 🗄️ Database Models

### User
- Email, password (hashed), name, role
- Profile (age, sex, BMI, diabetes type, activity level, allergies, etc.)
- Consent tracking
- Device management (for multi-device JWT tracking)
- Profile image (Cloudinary)

### FoodItem
- Local name, canonical name, category
- Nutrients (calories, carbs, protein, fat, fiber, GI)
- Portion sizes
- Affordability, tags, images
- Version control
- Soft delete support

### RuleTemplate
- Slug, title, type (constraint, scoring, substitution, alert)
- Definition (JSON DSL for client-side reasoning)
- NL template (for explanations)
- Version control

### MealLog
- User reference
- Food entries (food ID, portion, grams)
- Calculated totals
- Client-generated ID (idempotency)

### GlucoseLog
- User reference
- Value (mg/dL), type (fasting/postprandial/random)
- Timestamp, notes
- Client-generated ID (idempotency)

### RevokedToken
- JTI (token ID), user ID, expiry
- Reason (logout, admin_revoke, password_reset)
- TTL index (auto-cleanup)

### SyncCheckpoint
- User reference
- Client version, server version
- Last synced timestamp

### Audit
- Action, who (user), target (resource)
- Payload, IP, user agent
- Timestamp

### Config
- Key-value store for app-level config
- `serverVersion` - Global version counter

## 🔄 Sync Protocol

### Version Control

- **Server Version**: Global counter incremented when foods/rules are added/updated
- **Client Version**: Last known server version on client
- **Delta Sync**: Client sends `clientVersion`, server returns items with `version > clientVersion`

### Idempotency

- Clients send `clientGeneratedId` with logs
- Server checks if already processed before inserting
- Returns same response for duplicate requests

### Tombstones

- Deleted items returned as `{ _id, deleted: true, deletedAt, version }`
- Clients remove locally

### Sync Flow

1. **Upload Logs**: `POST /sync/upload` with meal/glucose logs
2. **Get Updates**: Server returns foods/rules changed since `clientVersion`
3. **Update Checkpoint**: Server records sync timestamp

4. **Full Sync**: `GET /sync/full` for first-time or forced resync

## 🧪 Testing

```bash
npm test
```

Tests include:
- Unit tests for services and utilities
- Integration tests for auth, sync, food, rule flows
- In-memory MongoDB for CI (mongodb-memory-server)

### Test Coverage

```bash
npm test -- --coverage
```

## 🚢 Deployment

### Recommended Platform: Render

1. **Create a new Web Service** on Render
2. **Connect your repository**
3. **Set environment variables** from `.env`
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`

### Pre-deployment Checklist

- [ ] Change admin password
- [ ] Set strong `JWT_SECRET` (32+ chars)
- [ ] Configure production MongoDB URI
- [ ] Set up Cloudinary account
- [ ] Set up Brevo API key
- [ ] Enable Swagger basic auth in production
- [ ] Review rate limiting settings
- [ ] Set up monitoring and logging

### Database Migration

If you need to migrate data:

```bash
npm run seed:initial
```

This script is idempotent and safe to run multiple times.

## 📁 Project Structure

```
Gluvia Backend/
├── src/
│   ├── config/
│   │   └── index.js              # Configuration loader
│   ├── models/
│   │   ├── user.model.js         # User schema
│   │   ├── food.model.js         # Food item schema
│   │   ├── ruleTemplate.model.js # Rule template schema
│   │   ├── mealLog.model.js      # Meal log schema
│   │   ├── glucoseLog.model.js   # Glucose log schema
│   │   ├── revokedToken.model.js # Revoked tokens schema
│   │   ├── syncCheckpoint.model.js # Sync checkpoint schema
│   │   ├── audit.model.js        # Audit log schema
│   │   └── config.model.js       # Config key-value store
│   ├── controllers/
│   │   ├── auth.controller.js    # Auth endpoints
│   │   ├── user.controller.js    # User profile endpoints
│   │   ├── food.controller.js    # Food CRUD endpoints
│   │   ├── rule.controller.js    # Rule template endpoints
│   │   ├── sync.controller.js    # Sync endpoints
│   │   ├── admin.controller.js   # Admin tools
│   │   └── report.controller.js  # Reports & analytics
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── foods.routes.js
│   │   ├── rules.routes.js
│   │   ├── sync.routes.js
│   │   ├── admin.routes.js
│   │   └── report.routes.js
│   ├── services/
│   │   ├── auth.service.js       # Auth business logic
│   │   ├── user.service.js       # User operations
│   │   ├── food.service.js       # Food operations
│   │   ├── rule.service.js       # Rule operations
│   │   ├── sync.service.js       # Sync operations
│   │   ├── cloudinary.service.js # Image upload
│   │   ├── email.service.js      # Email sending
│   │   └── audit.service.js      # Audit logging
│   ├── middlewares/
│   │   ├── auth.middleware.js    # JWT verification
│   │   ├── role.middleware.js    # Role-based access
│   │   ├── validate.middleware.js # Zod validation
│   │   ├── error.middleware.js   # Error handling
│   │   ├── rateLimit.middleware.js # Rate limiting
│   │   ├── ownership.middleware.js # Resource ownership
│   │   └── swaggerAuth.middleware.js # Swagger auth
│   ├── utils/
│   │   ├── jwt.util.js           # JWT helpers
│   │   ├── hash.util.js          # Password hashing
│   │   ├── pagination.util.js    # Pagination helpers
│   │   ├── idempotency.util.js   # Idempotency checking
│   │   └── validators.js         # Zod schemas
│   ├── docs/
│   │   └── swagger.js            # Swagger setup
│   ├── emails/
│   │   ├── welcome.html
│   │   ├── password_reset.html
│   │   ├── admin_notify_new_user.html
│   │   └── sync_failed.html
│   ├── app.js                    # Express app setup
│   └── server.js                 # Server startup
├── seeds/
│   ├── seedInitial.js            # Seed script
│   ├── seedFoods.json            # 50 food items
│   └── seedRules.json            # 10 rule templates
├── tests/
│   ├── auth.test.js
│   ├── sync.test.js
│   ├── food.test.js
│   └── rule.test.js
├── .env.example                  # Environment template
├── .gitignore
├── package.json
└── README.md
```

## 🔒 Security Features

- JWT with jti tracking and revocation
- bcrypt password hashing (12 rounds)
- Helmet for HTTP headers
- CORS configuration
- Rate limiting (general + auth-specific)
- Input validation with Zod
- MongoDB sanitization
- Token expiry and refresh policy
- Audit logging for admin actions

## 📝 License

MIT

## 👥 Support

For issues or questions:
- Email: support@gluvia.ai
- Documentation: http://localhost:5000/api-docs

## 🙏 Acknowledgments

- Nigerian food data sourced from validated nutrition databases
- Rule templates designed by diabetes management experts

---

**Built with ❤️ for better diabetes management in Africa**
