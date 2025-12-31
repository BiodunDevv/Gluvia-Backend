const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../src/models/user.model");
const FoodItem = require("../src/models/food.model");
const RuleTemplate = require("../src/models/ruleTemplate.model");
const Config = require("../src/models/config.model");
const { hashPassword } = require("../src/utils/hash.util");
const config = require("../src/config");
const { batchFetchFoodImages } = require("./utils/fetchFoodImage");

const foodsData = require("./seedFoods.json");
const rulesData = require("./seedRules.json");

const seedInitial = async () => {
  try {
    console.log("🌱 Starting database reset and seed...");

    // Connect to MongoDB
    await mongoose.connect(config.mongo.uri);
    console.log("✅ Connected to MongoDB");

    // Find the first admin to preserve
    const firstAdmin = await User.findOne({ role: "admin" }).sort({
      createdAt: 1,
    });

    if (firstAdmin) {
      console.log(`ℹ️  Preserving first admin: ${firstAdmin.email}`);
    }

    // Clear all collections
    console.log("🗑️  Clearing existing data...");

    // Delete all users except the first admin
    if (firstAdmin) {
      await User.deleteMany({ _id: { $ne: firstAdmin._id } });
      console.log("✅ Deleted all users except first admin");
    } else {
      await User.deleteMany({});
      console.log("✅ Deleted all users");
    }

    // Clear other collections
    await FoodItem.deleteMany({});
    console.log("✅ Cleared food items");

    await RuleTemplate.deleteMany({});
    console.log("✅ Cleared rule templates");

    await Config.deleteMany({});
    console.log("✅ Cleared configurations");

    // If no admin exists, create one
    if (!firstAdmin) {
      const adminPassword = config.admin.password || "Admin@123456";
      const passwordHash = await hashPassword(adminPassword);

      const admin = await User.create({
        email: config.admin.email,
        passwordHash,
        name: "Admin User",
        role: "admin",
        consent: {
          accepted: true,
          timestamp: new Date(),
        },
      });

      console.log("✅ Admin user created");
      console.log(`   Email: ${admin.email}`);
      console.log(`   Password: ${adminPassword}`);
      console.log("   ⚠️  PLEASE CHANGE THIS PASSWORD IMMEDIATELY!");
    } else {
      console.log("ℹ️  Using existing admin user");
    }

    // Seed foods with automatic image fetching using Gemini AI
    console.log("🖼️  Fetching images for food items using Gemini AI...");
    console.log("   This may take a few minutes for all items...");
    console.log("   ✨ AI will optimize search queries for better results");

    // Fetch images for all foods with AI enabled
    const foodImages = await batchFetchFoodImages(foodsData, 500, true); // 500ms delay, AI enabled

    // Create a map of food names to image URLs
    const imageMap = new Map();
    foodImages.forEach((item) => {
      imageMap.set(item.name, item.imageUrl);
    });

    // Merge image URLs with food data
    const foodsWithImages = foodsData.map((food) => ({
      ...food,
      imageUrl:
        imageMap.get(food.localName) ||
        "https://via.placeholder.com/800x600/2C3E50/FFFFFF?text=Food+Image",
    }));

    await FoodItem.insertMany(foodsWithImages);
    console.log(`✅ Seeded ${foodsWithImages.length} food items with images`);

    // Seed rules
    const admin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });
    const rulesWithCreator = rulesData.map((rule) => ({
      ...rule,
      createdBy: admin._id,
    }));

    await RuleTemplate.insertMany(rulesWithCreator);
    console.log(`✅ Seeded ${rulesData.length} rule templates`);

    // Initialize server version
    await Config.create({
      key: "serverVersion",
      value: 1,
    });
    console.log("✅ Initialized serverVersion to 1");

    console.log("\n🎉 Database reset and seed completed successfully!");
    console.log("\n📝 Summary:");
    console.log(`   - Admin: ${admin.email}`);
    console.log(
      `   - Food items: ${foodsWithImages.length} (with auto-fetched images)`
    );
    console.log(
      `   - Rule templates: ${rulesData.length} professional diabetes management rules`
    );
    console.log("\n📝 Next steps:");
    console.log(
      "   1. Visit: http://localhost:5000/api-docs for API documentation"
    );
    console.log("   2. Login with admin credentials");
    console.log(
      "   3. All foods now have images automatically fetched from Unsplash"
    );
    console.log(
      "   4. Rules cover: constraints, alerts, scoring, substitutions & portion adjustments"
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
};

seedInitial();
