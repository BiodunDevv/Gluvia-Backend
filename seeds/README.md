# Database Seeding System

## Overview

This seeding system automatically populates the database with:

- **84 Nigerian food items** with automatically fetched images
- **27 professional diabetes management rules**
- **Admin user account**
- **Server configuration**

## Features

### 🖼️ Automatic Image Fetching

The system automatically fetches high-quality food images using a multi-strategy approach:

1. **Curated Nigerian Food Images** - Pre-selected high-quality images for common Nigerian dishes
2. **Unsplash API** - Fetches contextual food images from Unsplash
3. **Placeholder Fallback** - Ensures every food has an image

### 📋 Professional Rule Sets

27 comprehensive diabetes management rules covering:

#### Constraints (3 rules)

- Maximum carbohydrate limits per meal
- Breakfast-specific carb guidelines
- Meal-specific restrictions

#### Alerts (12 rules)

- High glycemic index warnings
- Hypoglycemia prevention
- Meal timing optimization
- Insulin/medication timing
- Fried food caution
- Post-meal glucose reminders
- Processed food warnings
- Sugary beverage warnings
- Alcohol consumption caution
- Snacking frequency management
- Pre-exercise meal planning
- Sodium intake warnings
- Stress eating awareness
- Hydration reminders

#### Scoring (7 rules)

- Protein-rich food priority
- High fiber content boost
- Vegetable emphasis
- Affordable option priority
- Healthy fat balance
- Carb-to-fiber ratio scoring
- Fermented food benefits
- Local/seasonal food priority

#### Portion Adjustments (2 rules)

- Dynamic portion size recommendations
- Evening meal size optimization

#### Substitutions (1 rule)

- Whole grain alternatives

## Usage

### Run the Seed Script

```bash
npm run seed
```

Or directly:

```bash
node seeds/seedInitial.js
```

### What Happens During Seeding

1. **Database Connection** - Connects to MongoDB
2. **Data Preservation** - Preserves the first admin account if it exists
3. **Data Cleanup** - Clears all other users, foods, rules, and configs
4. **Admin Creation** - Creates admin account if none exists
5. **Image Fetching** - Fetches images for all 84 food items (takes 2-3 minutes)
6. **Food Seeding** - Inserts foods with images into database
7. **Rule Seeding** - Inserts 27 professional rules
8. **Config Initialization** - Sets up server version tracking

### Expected Output

```
🌱 Starting database reset and seed...
✅ Connected to MongoDB
🗑️  Clearing existing data...
✅ Deleted all users except first admin
✅ Cleared food items
✅ Cleared rule templates
✅ Cleared configurations
ℹ️  Using existing admin user
🖼️  Fetching images for food items...
   This may take a few minutes for all items...
🔍 Fetching image for: Jollof Rice
✅ Found curated image for Jollof Rice
📊 Progress: 10/84 images fetched
...
🎉 Completed fetching 84 images
✅ Seeded 84 food items with images
✅ Seeded 27 rule templates

🎉 Database reset and seed completed successfully!

📝 Summary:
   - Admin: admin@gluvia.com
   - Food items: 84 (with auto-fetched images)
   - Rule templates: 27 professional diabetes management rules

📝 Next steps:
   1. Visit: http://localhost:5000/api-docs for API documentation
   2. Login with admin credentials
   3. All foods now have images automatically fetched from Unsplash
   4. Rules cover: constraints, alerts, scoring, substitutions & portion adjustments
```

## Configuration

### Image Fetching Settings

You can customize the image fetching behavior in `utils/fetchFoodImage.js`:

```javascript
// Adjust delay between image requests (in milliseconds)
const foodImages = await batchFetchFoodImages(foodsData, 300); // 300ms delay
```

### Curated Images

Add more curated Nigerian food images in `utils/fetchFoodImage.js`:

```javascript
const curatedImages = {
  "Jollof Rice": "https://images.unsplash.com/photo-...",
  "Your Food": "https://your-image-url.com/...",
};
```

## Data Files

### seedFoods.json

Contains 84 Nigerian food items with:

- Local and canonical names
- Nutritional information (calories, carbs, protein, fat, fiber, GI)
- Portion sizes
- Affordability ratings
- Categories and tags
- Source validation

### seedRules.json

Contains 27 professional diabetes management rules with:

- Rule slug and title
- Rule type (constraint, alert, scoring, substitution, portion_adjustment)
- Logic definitions with conditions
- Natural language templates
- Priority levels
- Target user groups

## Troubleshooting

### Images Not Loading

If images fail to load:

1. Check internet connection
2. Verify Unsplash is accessible
3. System falls back to placeholder images automatically

### Seed Script Fails

Common issues:

- **MongoDB not running**: Start MongoDB service
- **Connection refused**: Check MONGO_URI in .env file
- **Permission errors**: Ensure proper database access rights

### Slow Image Fetching

Normal behavior - fetching 84 images takes 2-3 minutes with rate limiting to avoid API throttling.

## Development

### Add New Foods

1. Edit `seedFoods.json`
2. Add food object with required fields
3. Run seed script - image will be fetched automatically

### Add New Rules

1. Edit `seedRules.json`
2. Add rule object with:
   - slug (unique identifier)
   - title (display name)
   - type (constraint/alert/scoring/substitution/portion_adjustment)
   - definition (logic and conditions)
   - nlTemplate (user-facing message)
   - appliesTo (target categories)
3. Run seed script

### Modify Image Fetching

Edit `utils/fetchFoodImage.js` to:

- Add more curated images
- Change image sources
- Adjust image quality/size
- Modify fallback behavior

## API Integration

After seeding, the data is available through:

- **GET /foods** - Search all foods with images
- **GET /foods/:id** - Get specific food with image
- **GET /rules** - Get all active rules
- **GET /rules/:slug** - Get specific rule

All endpoints documented at `/api-docs`

## Production Notes

### Before Production Deployment

1. Use environment variables for API keys
2. Consider caching images to CDN
3. Add retry logic for failed image fetches
4. Implement image optimization pipeline
5. Set up monitoring for failed image loads

### Recommended Improvements

- Upload images to AWS S3/Cloudinary after fetching
- Cache image URLs in database
- Implement webhook for image updates
- Add image quality validation
- Create backup image sources

## License

Part of Gluvia Backend - Diabetes Management System
