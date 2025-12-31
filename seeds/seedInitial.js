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

    // Seed foods
    await FoodItem.insertMany(foodsData);
    console.log(`✅ Seeded ${foodsData.length} food items`);

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
    console.log(`   - Food items: ${foodsData.length}`);
    console.log(`   - Rule templates: ${rulesData.length}`);
    console.log("\n📝 Next steps:");
    console.log(
      "   1. Visit: http://localhost:5000/api-docs for API documentation"
    );
    console.log("   2. Login with admin credentials");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
};

seedInitial();
