const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });
const config = require("../src/config");
const FoodItem = require("../src/models/food.model");

async function check() {
  await mongoose.connect(config.mongo.uri);

  // Foods with empty string imageUrl
  const foods = await FoodItem.find({ imageUrl: "" }).limit(10);

  console.log(`Foods with empty imageUrl: ${foods.length}`);
  foods.forEach((f) => console.log(`- ${f.localName}`));

  const total = await FoodItem.countDocuments();
  const withImages = await FoodItem.countDocuments({
    imageUrl: { $ne: "" },
  });

  console.log(`\nTotal foods: ${total}`);
  console.log(`With images: ${withImages}`);
  console.log(`Without images (empty string): ${total - withImages}`);

  // Show a few with images
  console.log("\nSample foods WITH images:");
  const withImgs = await FoodItem.find({ imageUrl: { $ne: "" } }).limit(3);
  withImgs.forEach((f) =>
    console.log(`- ${f.localName}: ${f.imageUrl.substring(0, 50)}...`)
  );

  await mongoose.disconnect();
}

check();
