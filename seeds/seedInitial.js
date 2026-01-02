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

const foodsData = [
  ...require("./seedFoods.json"),
  ...require("./seedFoodsTwo.json"),
];
const rulesData = [
  ...require("./seedRules.json"),
  ...require("./seedRulesTwo.json"),
];

const seedInitial = async () => {
  try {
    console.log("🌱 Starting fast seed (preserving users)...");

    // Connect to MongoDB
    await mongoose.connect(config.mongo.uri);
    console.log("✅ Connected to MongoDB");

    // Count existing users
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: "admin" });
    const regularUsers = totalUsers - totalAdmins;

    console.log(`ℹ️  Preserving ALL users:`);
    console.log(`   - Admins: ${totalAdmins}`);
    console.log(`   - Regular users: ${regularUsers}`);
    console.log(`   - Total: ${totalUsers}`);

    // Clear only foods and rules (preserve all users)
    console.log("\n🗑️  Clearing foods and rules only...");

    await FoodItem.deleteMany({});
    console.log("✅ Cleared food items");

    await RuleTemplate.deleteMany({});
    console.log("✅ Cleared rule templates");

    // Check if Config exists, if not initialize
    const serverVersionConfig = await Config.findOne({ key: "serverVersion" });
    if (!serverVersionConfig) {
      await Config.create({
        key: "serverVersion",
        value: 1,
      });
      console.log("✅ Initialized serverVersion to 1");
    }

    // Ensure at least one admin exists
    const admin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });

    if (!admin) {
      console.log("\n⚠️  No admin found, creating one...");
      const adminPassword = config.admin.password || "Admin@123456";
      const passwordHash = await hashPassword(adminPassword);

      const newAdmin = await User.create({
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
      console.log(`   Email: ${newAdmin.email}`);
      console.log(`   Password: ${adminPassword}`);
      console.log("   ⚠️  PLEASE CHANGE THIS PASSWORD IMMEDIATELY!");
    }

    // Seed foods WITHOUT images (empty string)
    console.log("\n🍽️  Seeding food items (no images for fast seeding)...");

    // Set all imageUrl to empty string
    const foodsWithoutImages = foodsData.map((food) => ({
      ...food,
      imageUrl: "",
    }));

    await FoodItem.insertMany(foodsWithoutImages);
    console.log(
      `✅ Seeded ${foodsWithoutImages.length} food items (imageUrl: empty)`
    );

    // Seed rules
    const currentAdmin = await User.findOne({ role: "admin" }).sort({
      createdAt: 1,
    });
    const rulesWithCreator = rulesData.map((rule) => ({
      ...rule,
      createdBy: currentAdmin._id,
    }));

    await RuleTemplate.insertMany(rulesWithCreator);
    console.log(`✅ Seeded ${rulesData.length} rule templates`);

    console.log("\n🎉 Fast seed completed successfully!");
    console.log("\n📝 Summary:");
    console.log(
      `   - Users preserved: ${totalUsers} (${totalAdmins} admins, ${regularUsers} regular)`
    );
    console.log(
      `   - Food items: ${foodsWithoutImages.length} (all with empty imageUrl)`
    );
    console.log(`   - Rule templates: ${rulesData.length}`);
    console.log("\n💡 Note:");
    console.log("   - All foods seeded without images for fast performance");
    console.log("   - Admins can add images via the food update API");
    console.log("   - Use POST /foods/:id with imageUrl in the body");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
};

seedInitial();
