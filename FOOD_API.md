# Food API Documentation

## Base URL

```
Production: https://gluvia-backend.onrender.com
Development: http://localhost:5000
```

## Authentication

Most endpoints require Bearer token authentication:

```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Get All Foods (Public)

**GET** `/api/foods`

**Query Parameters:**

- `search` (string): Text search across food names and tags
- `tags` (string): Comma-separated tags (e.g., "snack,protein")
- `maxGI` (number): Maximum glycemic index
- `category` (string): Filter by category
- `affordability` (string): Filter by affordability (low, medium, high)
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "695508e797f9abec442869a2",
      "localName": "Jollof Rice",
      "canonicalName": "Nigerian Jollof Rice",
      "category": "Grains & Staples",
      "nutrients": {
        "calories": 180,
        "carbs_g": 38,
        "protein_g": 3.5,
        "fat_g": 2.5,
        "fibre_g": 1.2,
        "gi": 72
      },
      "portionSizes": [
        {
          "name": "Small plate",
          "grams": 150,
          "carbs_g": 57
        }
      ],
      "affordability": "medium",
      "tags": ["rice", "Nigerian", "staple"],
      "imageUrl": "https://example.com/image.jpg",
      "source": "validated",
      "version": 1,
      "deleted": false,
      "regionVariants": [],
      "createdAt": "2025-12-31T11:28:39.919Z",
      "updatedAt": "2025-12-31T11:28:39.919Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 85,
    "totalPages": 2,
    "hasMore": true
  }
}
```

### 2. Get Food by ID (Public)

**GET** `/api/foods/:id`

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "695508e797f9abec442869a2",
    "localName": "Jollof Rice",
    "canonicalName": "Nigerian Jollof Rice",
    "category": "Grains & Staples",
    "nutrients": {
      "calories": 180,
      "carbs_g": 38,
      "protein_g": 3.5,
      "fat_g": 2.5,
      "fibre_g": 1.2,
      "gi": 72
    },
    "portionSizes": [
      {
        "name": "Small plate",
        "grams": 150,
        "carbs_g": 57
      }
    ],
    "affordability": "medium",
    "tags": ["rice", "Nigerian", "staple"],
    "imageUrl": "https://example.com/image.jpg",
    "source": "validated",
    "version": 1,
    "deleted": false
  }
}
```

### 3. Create Food (Admin Only)

**POST** `/api/foods`

**Headers:**

```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "localName": "Abacha (African Salad)",
  "canonicalName": "Cassava Salad",
  "category": "Snacks",
  "nutrients": {
    "calories": 180,
    "carbs_g": 38,
    "protein_g": 2,
    "fat_g": 3,
    "fibre_g": 2.8,
    "gi": 60
  },
  "portionSizes": [
    {
      "name": "Small plate",
      "grams": 150,
      "carbs_g": 57
    },
    {
      "name": "Medium plate",
      "grams": 200,
      "carbs_g": 76
    }
  ],
  "affordability": "medium",
  "tags": ["cassava", "salad", "snack"],
  "imageUrl": "https://res.cloudinary.com/df4f0usnh/image/upload/v1767193002/yiw1dmp0d3janr2mwwtw.jpg",
  "source": "validated",
  "regionVariants": [
    {
      "region": "Southern",
      "note": "Popular in Igbo cuisine"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Food created successfully",
  "data": {
    "_id": "695508e797f9abec442869a2",
    "localName": "Abacha (African Salad)",
    "canonicalName": "Cassava Salad",
    "category": "Snacks",
    "nutrients": {
      "calories": 180,
      "carbs_g": 38,
      "protein_g": 2,
      "fat_g": 3,
      "fibre_g": 2.8,
      "gi": 60
    },
    "portionSizes": [
      {
        "name": "Small plate",
        "grams": 150,
        "carbs_g": 57
      }
    ],
    "affordability": "medium",
    "tags": ["cassava", "salad", "snack"],
    "imageUrl": "https://res.cloudinary.com/df4f0usnh/image/upload/v1767193002/yiw1dmp0d3janr2mwwtw.jpg",
    "source": "validated",
    "version": 1,
    "deleted": false,
    "createdAt": "2025-12-31T11:28:39.919Z",
    "updatedAt": "2025-12-31T11:28:39.919Z"
  },
  "serverVersion": 123
}
```

### 4. Update Food (Admin Only)

**PUT** `/api/foods/:id`

**Headers:**

```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "localName": "Abacha (Updated Name)",
  "imageUrl": "https://new-image-url.com/image.jpg",
  "nutrients": {
    "calories": 185,
    "carbs_g": 40,
    "protein_g": 2.5,
    "fat_g": 3,
    "fibre_g": 3.0,
    "gi": 58
  },
  "affordability": "low",
  "tags": ["cassava", "salad", "snack", "healthy"]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Food updated successfully",
  "data": {
    "_id": "695508e797f9abec442869a2",
    "localName": "Abacha (Updated Name)",
    "canonicalName": "Cassava Salad",
    "category": "Snacks",
    "nutrients": {
      "calories": 185,
      "carbs_g": 40,
      "protein_g": 2.5,
      "fat_g": 3,
      "fibre_g": 3.0,
      "gi": 58
    },
    "affordability": "low",
    "tags": ["cassava", "salad", "snack", "healthy"],
    "imageUrl": "https://new-image-url.com/image.jpg",
    "version": 2,
    "updatedAt": "2025-12-31T12:00:00.000Z"
  },
  "serverVersion": 124
}
```

### 5. Delete Food (Admin Only)

**DELETE** `/api/foods/:id`

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "message": "Food deleted successfully"
}
```

### 6. Batch Create/Update Foods (Admin Only)

**POST** `/api/foods/batch`

**Headers:**

```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "foods": [
    {
      "localName": "Food 1",
      "canonicalName": "Food 1 Canonical",
      "category": "Snacks",
      "nutrients": {
        "calories": 100,
        "carbs_g": 20,
        "protein_g": 5,
        "fat_g": 2,
        "fibre_g": 1,
        "gi": 50
      },
      "portionSizes": [
        {
          "name": "Small",
          "grams": 100,
          "carbs_g": 20
        }
      ],
      "affordability": "low",
      "tags": ["snack"],
      "imageUrl": "https://example.com/food1.jpg",
      "source": "validated"
    },
    {
      "localName": "Food 2",
      "canonicalName": "Food 2 Canonical",
      "category": "Protein Foods",
      "nutrients": {
        "calories": 150,
        "carbs_g": 5,
        "protein_g": 25,
        "fat_g": 5,
        "fibre_g": 0,
        "gi": 0
      },
      "portionSizes": [
        {
          "name": "Medium",
          "grams": 150,
          "carbs_g": 7.5
        }
      ],
      "affordability": "medium",
      "tags": ["protein", "meat"],
      "imageUrl": "https://example.com/food2.jpg",
      "source": "validated"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Batch operation completed",
  "stats": {
    "created": 2,
    "updated": 0,
    "total": 2
  }
}
```

### 7. Search Food Image (Authenticated)

**POST** `/api/foods/search-image`

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "foodName": "Jollof Rice",
  "useAI": true
}
```

**Success Response:**

```json
{
  "success": true,
  "message": "Image search completed",
  "data": {
    "foodName": "Jollof Rice",
    "searchQuery": "Nigerian Jollof Rice traditional dish",
    "imageUrl": "https://example.com/jollof-rice.jpg",
    "source": "google",
    "usedAI": true
  }
}
```

**Rate Limit Error Response (429):**

```json
{
  "success": false,
  "message": "Image search failed - API rate limit may have been reached. Please try again later.",
  "data": {
    "foodName": "Jollof Rice",
    "searchQuery": "Nigerian Jollof Rice traditional dish",
    "usedAI": true,
    "source": "none"
  }
}
```

## Data Models

### Food Item Schema

```typescript
interface FoodItem {
  _id: string;
  localName: string; // Required - Local/common name
  canonicalName?: string; // Optional - Standard/scientific name
  category?: string; // Optional - Food category
  nutrients: {
    calories: number; // Calories per 100g
    carbs_g: number; // Carbohydrates in grams
    protein_g: number; // Protein in grams
    fat_g: number; // Fat in grams
    fibre_g: number; // Fiber in grams
    gi: number | null; // Glycemic Index (can be null)
  };
  portionSizes: Array<{
    name: string; // e.g., "Small plate", "1 cup"
    grams: number; // Weight in grams
    carbs_g?: number; // Carbs for this portion
  }>;
  affordability?: "low" | "medium" | "high"; // Price category
  tags?: string[]; // Search tags
  imageUrl?: string; // Food image URL
  regionVariants?: Array<{
    region: string;
    note: string;
  }>;
  source?: "manual" | "validated" | "estimated"; // Data source
  version: number; // For sync/conflict resolution
  deleted: boolean; // Soft delete flag
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
```

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "message": "Invalid input data"
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "Admin access required"
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Food not found"
}
```

### 409 Conflict

```json
{
  "success": false,
  "message": "Food already exists: Jollof Rice"
}
```

### 429 Too Many Requests

```json
{
  "success": false,
  "message": "API rate limit reached. Please try again later."
}
```

## Usage Examples

### Next.js/React Example - Get All Foods

```typescript
const fetchFoods = async (page = 1, search = "") => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: "50",
    ...(search && { search }),
  });

  const response = await fetch(
    `https://gluvia-backend.onrender.com/api/foods?${params}`
  );
  const data = await response.json();

  return data;
};
```

### Next.js/React Example - Create Food

```typescript
const createFood = async (foodData: FoodItem, token: string) => {
  const response = await fetch(
    "https://gluvia-backend.onrender.com/api/foods",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(foodData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to create food");
  }

  return data;
};
```

### Next.js/React Example - Update Food

```typescript
const updateFood = async (
  id: string,
  updates: Partial<FoodItem>,
  token: string
) => {
  const response = await fetch(
    `https://gluvia-backend.onrender.com/api/foods/${id}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update food");
  }

  return data;
};
```

### Next.js/React Example - Search Food Image

```typescript
const searchFoodImage = async (foodName: string, token: string) => {
  const response = await fetch(
    "https://gluvia-backend.onrender.com/api/foods/search-image",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ foodName, useAI: true }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to search image");
  }

  return data;
};
```

## Notes

- All timestamps are in ISO 8601 format (UTC)
- The `images` field has been removed from responses - only `imageUrl` is used
- `version` field is used for optimistic locking in updates
- Soft deletes are used - `deleted: true` instead of actual deletion
- Admin endpoints require JWT token with admin role
- Public endpoints (GET all, GET by ID) don't require authentication
