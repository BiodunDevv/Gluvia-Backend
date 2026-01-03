const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const FoodItem = require("../src/models/food.model");
const config = require("../src/config");
const { fetchFoodImage } = require("./utils/fetchFoodImage");

/**
 * Seed food images using AI-powered search
 * This script fetches images ONLY for foods that have empty/missing imageUrl
 * It uses Gemini AI to optimize search queries and Google Custom Search for images
 */

// Configuration
const BATCH_SIZE = 5; // Process in batches to avoid overwhelming APIs
const DELAY_BETWEEN_FOODS_MS = 3000; // 3 seconds between each food (rate limiting)
const DELAY_BETWEEN_BATCHES_MS = 10000; // 10 seconds between batches
const USE_AI = true; // Use Gemini AI for query optimization
const MAX_FOODS = 0; // Set to 0 for unlimited, or a number to limit (for testing)

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Update a single food item with an image
 */
async function updateFoodImage(food) {
  try {
    console.log(`\n🔍 Searching image for: ${food.localName}`);

    const imageUrl = await fetchFoodImage(food.localName, USE_AI);

    if (imageUrl && imageUrl.length > 0) {
      await FoodItem.findByIdAndUpdate(
        food._id,
        {
          imageUrl: imageUrl,
          $inc: { version: 1 }, // Increment version for sync
        },
        { new: true }
      );
      console.log(`✅ Updated: ${food.localName}`);
      console.log(`   Image: ${imageUrl.substring(0, 80)}...`);
      return { success: true, food: food.localName, imageUrl };
    } else {
      console.log(`❌ No image found for: ${food.localName}`);
      return { success: false, food: food.localName, error: "No image found" };
    }
  } catch (error) {
    console.log(`❌ Error for ${food.localName}: ${error.message}`);
    return { success: false, food: food.localName, error: error.message };
  }
}

/**
 * Main seeding function
 */
async function seedFoodImages() {
  console.log("🌱 ========================================");
  console.log("🌱 FOOD IMAGE SEEDER (AI-Powered)");
  console.log("🌱 ========================================\n");

  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongo.uri);
    console.log("✅ Connected to MongoDB\n");

    // Get ONLY foods that need images (empty or missing imageUrl)
    console.log("🔎 Scanning database for foods without images...\n");

    const foods = await FoodItem.find({
      $or: [
        { imageUrl: { $exists: false } },
        { imageUrl: null },
        { imageUrl: "" },
      ],
    }).sort({ localName: 1 });

    // Show total vs needing images
    const totalFoods = await FoodItem.countDocuments();
    const foodsWithImages = await FoodItem.countDocuments({
      imageUrl: { $exists: true, $ne: null, $ne: "" },
    });

    console.log(`📊 Database Status:`);
    console.log(`   - Total foods: ${totalFoods}`);
    console.log(`   - With images: ${foodsWithImages}`);
    console.log(`   - Missing images: ${foods.length}`);

    console.log(`\n⚙️  Configuration:`);
    console.log(`   - Batch size: ${BATCH_SIZE}`);
    console.log(`   - Delay between foods: ${DELAY_BETWEEN_FOODS_MS}ms`);
    console.log(`   - Delay between batches: ${DELAY_BETWEEN_BATCHES_MS}ms`);
    console.log(`   - Use AI optimization: ${USE_AI}`);
    console.log(
      `   - Max foods limit: ${MAX_FOODS > 0 ? MAX_FOODS : "unlimited"}`
    );

    // Apply MAX_FOODS limit if set
    let foodsToProcess = foods;
    if (MAX_FOODS > 0 && foods.length > MAX_FOODS) {
      console.log(`\n⚠️  Test mode: Limiting to ${MAX_FOODS} foods`);
      foodsToProcess = foods.slice(0, MAX_FOODS);
    }

    if (foodsToProcess.length === 0) {
      console.log("\n✅ All foods already have images! Nothing to do.");
      process.exit(0);
    }

    // List foods to process
    console.log(`\n📝 Foods without images (${foodsToProcess.length}):`);
    foodsToProcess.forEach((f, i) =>
      console.log(`   ${i + 1}. ${f.localName}`)
    );

    // Process statistics
    const stats = {
      total: foodsToProcess.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    // Process foods in batches
    const totalBatches = Math.ceil(foodsToProcess.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, foodsToProcess.length);
      const batch = foodsToProcess.slice(start, end);

      console.log(
        `\n📦 Processing Batch ${batchIndex + 1}/${totalBatches} (foods ${start + 1}-${end})...`
      );
      console.log("─".repeat(50));

      for (let i = 0; i < batch.length; i++) {
        const food = batch[i];
        const result = await updateFoodImage(food);

        if (result.success) {
          stats.success++;
        } else {
          stats.failed++;
          stats.errors.push({ food: result.food, error: result.error });
        }

        // Progress update
        const progress = (
          ((start + i + 1) / foodsToProcess.length) *
          100
        ).toFixed(1);
        console.log(
          `📊 Overall Progress: ${start + i + 1}/${foodsToProcess.length} (${progress}%)`
        );

        // Delay between foods (except for last one in batch)
        if (i < batch.length - 1) {
          await sleep(DELAY_BETWEEN_FOODS_MS);
        }
      }

      // Delay between batches (except for last batch)
      if (batchIndex < totalBatches - 1) {
        console.log(
          `\n⏳ Waiting ${DELAY_BETWEEN_BATCHES_MS / 1000}s before next batch...`
        );
        await sleep(DELAY_BETWEEN_BATCHES_MS);
      }
    }

    // Print summary
    console.log("\n\n🎉 ========================================");
    console.log("🎉 SEEDING COMPLETE!");
    console.log("🎉 ========================================\n");
    console.log(`📊 Final Statistics:`);
    console.log(`   ✅ Success: ${stats.success}/${stats.total}`);
    console.log(`   ❌ Failed: ${stats.failed}/${stats.total}`);
    console.log(
      `   📈 Success Rate: ${((stats.success / stats.total) * 100).toFixed(1)}%`
    );

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Failed Foods:`);
      stats.errors.forEach(({ food, error }) => {
        console.log(`   - ${food}: ${error}`);
      });
    }

    // Update server version in config
    const Config = require("../src/models/config.model");
    await Config.findOneAndUpdate(
      { key: "serverVersion" },
      { $inc: { value: 1 } },
      { upsert: true }
    );
    console.log("\n✅ Server version incremented for sync");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seed error:", error);
    process.exit(1);
  }
}

// Run the seeder
seedFoodImages();
