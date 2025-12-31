# GLUVIA AI Backend - Quick API Reference

Base URL: `http://localhost:5000` (Development)

---

## 🔐 Authentication Endpoints

### Register New User

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "consent": {
    "accepted": true,
    "timestamp": "2025-01-10T10:00:00Z"
  }
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { "id": "...", "email": "...", "role": "user" }
  }
}
```

### Password Reset Request

```http
POST /auth/password-reset-request
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Logout

```http
POST /auth/logout
Authorization: Bearer {token}
```

---

## 👤 User Profile Endpoints

### Get Own Profile

```http
GET /user/me
Authorization: Bearer {token}
```

### Update Profile

```http
PUT /user/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Jane Doe",
  "phone": "+2348012345678",
  "age": 35,
  "diabetesType": "type2",
  "preferences": {
    "cuisinePreferences": ["nigerian", "mediterranean"],
    "dietaryRestrictions": ["vegetarian"],
    "allergies": ["peanuts"]
  }
}
```

### Export User Data (NDPR)

```http
GET /user/me/export
Authorization: Bearer {token}
```

### Delete Account (NDPR)

```http
DELETE /user/me
Authorization: Bearer {token}
```

---

## 🍽️ Foods Database Endpoints

### Get Foods List (Public)

```http
GET /foods?page=1&limit=20&search=rice&category=grains&gi_min=0&gi_max=55
```

Query Parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `search`: Search by name/keywords
- `category`: Filter by category (grains, proteins, vegetables, etc.)
- `gi_min`: Minimum glycemic index
- `gi_max`: Maximum glycemic index

### Get Food By ID (Public)

```http
GET /foods/{foodId}
```

### Create Food (Admin Only)

```http
POST /foods
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "localName": "Jollof Rice",
  "englishName": "Jollof Rice",
  "category": "grains",
  "glycemicIndex": 68,
  "glycemicLoad": 25,
  "nutrients": {
    "calories": 250,
    "protein": 5,
    "carbohydrates": 45,
    "fat": 8,
    "fiber": 2
  },
  "servingSizes": [
    { "unit": "cup", "grams": 200 }
  ],
  "tags": ["nigerian", "popular", "rice"],
  "imageUrl": "https://..."
}
```

### Batch Upload Foods (Admin Only)

```http
POST /foods/batch
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "foods": [
    { /* food 1 */ },
    { /* food 2 */ }
  ]
}
```

---

## 📏 Rule Templates Endpoints

### Get Rules List (Public)

```http
GET /rules
```

### Get Rule By Slug (Public)

```http
GET /rules/{slug}
```

Examples:

- `/rules/max-carb-per-meal`
- `/rules/low-gi-substitution`

### Create Rule (Admin Only)

```http
POST /rules
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "slug": "custom-rule",
  "title": "Custom Rule Title",
  "type": "constraint",
  "definition": {
    "maxValue": 60,
    "field": "carbohydrates"
  },
  "nlTemplate": "Keep carbs under {maxValue}g per meal",
  "appliesTo": ["type2"]
}
```

Rule Types:

- `constraint`: Hard limits
- `scoring`: Preference scoring
- `substitution`: Food swaps
- `portion_adjustment`: Serving size changes
- `alert`: Warning messages

### Update Rule (Admin Only)

```http
PUT /rules/{slug}
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "title": "Updated Title",
  "definition": { /* updated definition */ }
}
```

### Delete Rule (Admin Only)

```http
DELETE /rules/{slug}
Authorization: Bearer {adminToken}
```

---

## 🔄 Offline Sync Endpoints

### Full Sync

```http
GET /sync/full
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "serverVersion": 14,
    "foods": [ /* all foods */ ],
    "rules": [ /* all rules */ ],
    "timestamp": "2025-01-10T10:00:00Z"
  }
}
```

### Delta Updates

```http
GET /sync/updates?clientVersion=10
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "serverVersion": 14,
    "hasChanges": true,
    "changes": {
      "foods": {
        "created": [ /* new foods since v10 */ ],
        "updated": [ /* modified foods */ ],
        "deleted": ["foodId1", "foodId2"]
      },
      "rules": {
        "created": [],
        "updated": [],
        "deleted": []
      }
    }
  }
}
```

### Upload Logs (Idempotent)

```http
POST /sync/upload
Authorization: Bearer {token}
Content-Type: application/json

{
  "logs": {
    "meals": [
      {
        "clientGeneratedId": "meal-uuid-123",
        "entries": [
          {
            "foodId": "695337d56a409d67cacacb35",
            "servingSize": { "unit": "cup", "quantity": 1 }
          }
        ],
        "timestamp": "2025-01-10T08:00:00Z",
        "mealType": "breakfast"
      }
    ],
    "glucose": [
      {
        "clientGeneratedId": "glucose-uuid-456",
        "value": 120,
        "unit": "mg/dL",
        "timestamp": "2025-01-10T10:00:00Z",
        "context": "post_meal"
      }
    ]
  },
  "clientVersion": 14
}

Response:
{
  "success": true,
  "message": "Logs uploaded successfully",
  "stats": {
    "meals": { "added": 1, "duplicates": 0 },
    "glucose": { "added": 1, "duplicates": 0 }
  }
}
```

---

## 📊 Reports Endpoints

### User Nutrition Report

```http
GET /reports/user/{userId}/nutrition?from=2025-01-01T00:00:00Z&to=2025-01-10T23:59:59Z
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "mealLogs": [ /* meal logs in date range */ ],
    "glucoseLogs": [ /* glucose logs in date range */ ],
    "stats": {
      "totalMeals": 30,
      "totalGlucoseReadings": 45,
      "avgCalories": 450,
      "avgCarbs": 60,
      "avgProtein": 25,
      "avgFat": 15,
      "avgGlucose": 125
    }
  }
}
```

**Note**: Users can only access their own reports unless they are admins.

---

## ⚙️ Admin Endpoints

### Get Audit Logs

```http
GET /admin/audit?page=1&limit=50
Authorization: Bearer {adminToken}
```

### Revoke User Tokens

```http
POST /admin/revoke-user-tokens
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "userId": "69533c79e42c5db05ea07af6",
  "reason": "Security concern"
}
```

### Run Initial Seed (Idempotent)

```http
POST /admin/seed-initial
Authorization: Bearer {adminToken}
```

---

## 🔒 Security & Validation

### Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number

### Email Format

- Must be valid email format
- Example: `user@example.com`

### Consent Requirements

- Must provide `consent.accepted: true` during registration
- Optional: `consent.timestamp`

### Rate Limiting

- **Auth endpoints**: 10 requests per 15 minutes per IP
- Exceeding limit returns: `429 Too Many Requests`

---

## 📝 Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    /* response data */
  },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "stack": "Stack trace (development only)"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Invalid input data
- `UNAUTHORIZED`: Missing or invalid token
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

---

## 🚀 Quick Start

### 1. Register a New User

```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "name": "Test User",
    "consent": {"accepted": true}
  }'
```

### 2. Login and Get Token

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

### 3. Get Foods List

```bash
curl http://localhost:5000/foods
```

### 4. Upload a Meal Log

```bash
curl -X POST http://localhost:5000/sync/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "logs": {
      "meals": [{
        "clientGeneratedId": "meal-123",
        "entries": [{
          "foodId": "FOOD_ID_FROM_FOODS_LIST",
          "servingSize": {"unit": "cup", "quantity": 1}
        }],
        "timestamp": "2025-01-10T12:00:00Z",
        "mealType": "lunch"
      }]
    },
    "clientVersion": 14
  }'
```

---

## 📚 Additional Resources

- **Swagger Documentation**: http://localhost:5000/api-docs/
- **Health Check**: http://localhost:5000/health
- **Testing Report**: See `TESTING_REPORT.md`

---

## 🔧 Environment Variables

Required `.env` variables:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/gluvia
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=30d

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Brevo (for emails)
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=noreply@gluvia.com
BREVO_SENDER_NAME=Gluvia AI

# Admin User (for seeding)
ADMIN_EMAIL=admin@gluvia.com
ADMIN_PASSWORD=your-admin-password
```

---

**Last Updated**: January 2025  
**API Version**: 1.0.0
