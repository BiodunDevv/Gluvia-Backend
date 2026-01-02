const mongoose = require("mongoose");
const config = require("../src/config");

(async () => {
  try {
    await mongoose.connect(config.mongo.uri);

    const FoodItem = require("../src/models/food.model");
    const RuleTemplate = require("../src/models/ruleTemplate.model");

    const foodCount = await FoodItem.countDocuments();
    const ruleCount = await RuleTemplate.countDocuments();

    console.log("📊 Database verification:");
    console.log("   - Food items:", foodCount);
    console.log("   - Rule templates:", ruleCount);

    const newFoods = await FoodItem.find({
      localName: {
        $in: [
          "Tuwo Shinkafa",
          "Miyan Kuka",
          "Nkwobi",
          "Afang Soup",
          "Kuli Kuli",
        ],
      },
    });

    console.log("\n✅ Sample new foods found:");
    newFoods.forEach((f) =>
      console.log(
        "   - " +
          f.localName +
          " (Category: " +
          f.category +
          ", GI: " +
          f.nutrients.gi +
          ")"
      )
    );

    const newRules = await RuleTemplate.find({
      slug: {
        $in: [
          "ramadan-fasting-sahur",
          "metformin-alcohol-interaction",
          "pregnancy-diabetes-constraint",
        ],
      },
    });

    console.log("\n✅ Sample new rules found:");
    newRules.forEach((r) =>
      console.log("   - " + r.title + " (Type: " + r.type + ")")
    );

    // Get breakdown by category
    const categories = await FoodItem.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    console.log("\n📋 Foods by category:");
    categories.forEach((cat) =>
      console.log("   - " + cat._id + ": " + cat.count)
    );

    // Get breakdown by rule type
    const ruleTypes = await RuleTemplate.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    console.log("\n📋 Rules by type:");
    ruleTypes.forEach((rt) => console.log("   - " + rt._id + ": " + rt.count));

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
})();
