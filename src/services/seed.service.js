const FoodItem = require("../models/food.model");
const RuleTemplate = require("../models/ruleTemplate.model");
const User = require("../models/user.model");
const Config = require("../models/config.model");
const { hashPassword } = require("../utils/hash.util");
const settingsService = require("./settings.service");
const { fetchFoodImage } = require("../../seeds/utils/fetchFoodImage");

const FOOD_SEED_FILES = [
  { key: "seedFoods.json", label: "Food Seed 1", items: require("../../seeds/seedFoods.json") },
  { key: "seedFoodsTwo.json", label: "Food Seed 2", items: require("../../seeds/seedFoodsTwo.json") },
  { key: "seedFoodsThree.json", label: "Food Seed 3", items: require("../../seeds/seedFoodsThree.json") },
];

const RULE_SEED_FILES = [
  { key: "seedRules.json", label: "Rule Seed 1", items: require("../../seeds/seedRules.json") },
  { key: "seedRulesTwo.json", label: "Rule Seed 2", items: require("../../seeds/seedRulesTwo.json") },
];

const dedupeFoods = (foods) => {
  const uniqueFoods = new Map();

  for (const food of foods) {
    uniqueFoods.set(`${food.localName}::${food.canonicalName || ""}`, food);
  }

  return [...uniqueFoods.values()];
};

const foodsData = dedupeFoods(FOOD_SEED_FILES.flatMap((file) => file.items));
const rulesData = RULE_SEED_FILES.flatMap((file) => file.items);

const DEFAULT_TARGETS = ["foods", "rules", "config"];

const DEMO_USERS = [
  {
    email: "demo.user@gluvia.ai",
    name: "Demo User",
    password: "DemoUser@123",
    role: "user",
  },
  {
    email: "demo.admin@gluvia.ai",
    name: "Demo Admin",
    password: "DemoAdmin@123",
    role: "admin",
  },
];

const normalizeTargets = (targets) => {
  if (!Array.isArray(targets) || targets.length === 0) {
    return DEFAULT_TARGETS;
  }

  return [...new Set(targets.filter(Boolean))];
};

const getSeedPreview = async () => {
  const [foodCount, ruleCount, userCount] = await Promise.all([
    FoodItem.countDocuments({ deleted: false }),
    RuleTemplate.countDocuments({ deleted: false }),
    User.countDocuments({ deleted: false }),
  ]);

  return {
    defaults: {
      targets: DEFAULT_TARGETS,
      mode: "additive",
      imageSource: "google-custom-search",
    },
    availableTargets: [
      {
        id: "foods",
        label: "Foods",
        description: "Seeds all three food datasets and can enrich missing images with Google search.",
        plannedItems: foodsData.length,
        currentItems: foodCount,
        files: FOOD_SEED_FILES.map((file) => ({
          key: file.key,
          label: file.label,
          items: file.items.length,
        })),
      },
      {
        id: "rules",
        label: "Rules",
        description: "Seeds both rule datasets for recommendations and safeguards.",
        plannedItems: rulesData.length,
        currentItems: ruleCount,
        files: RULE_SEED_FILES.map((file) => ({
          key: file.key,
          label: file.label,
          items: file.items.length,
        })),
      },
      {
        id: "config",
        label: "Config defaults",
        description: "Seeds maintenance defaults, support phone, form link, and default seed settings.",
        plannedItems: 3,
        currentItems: 3,
        files: [],
      },
      {
        id: "users",
        label: "Demo users",
        description: "Seeds demo user and demo admin accounts if they do not already exist.",
        plannedItems: DEMO_USERS.length,
        currentItems: userCount,
        files: [],
      },
    ],
  };
};

const seedFoods = async ({ destructive = false, includeImages = false }) => {
  if (destructive) {
    await FoodItem.deleteMany({});
  }

  const existingFoods = destructive
    ? []
    : await FoodItem.find({})
        .select("localName canonicalName imageUrl")
        .lean();
  const existingImageMap = new Map(
    existingFoods.map((food) => [
      `${food.localName}::${food.canonicalName || ""}`,
      typeof food.imageUrl === "string" ? food.imageUrl.trim() : "",
    ])
  );

  let imageUpdated = 0;
  let imageSkipped = 0;
  let imageErrors = 0;

  const seededFoods = includeImages
    ? await Promise.all(
        foodsData.map(async (food) => {
          const seedKey = `${food.localName}::${food.canonicalName || ""}`;
          const existingImageUrl = existingImageMap.get(seedKey);

          if (existingImageUrl) {
            imageSkipped += 1;
            return { ...food, imageUrl: existingImageUrl };
          }

          if (food.imageUrl) {
            imageSkipped += 1;
            return food;
          }

          try {
            const imageUrl = await fetchFoodImage(food.localName, true);
            if (imageUrl) {
              imageUpdated += 1;
              return { ...food, imageUrl };
            }
            imageSkipped += 1;
            return food;
          } catch (_error) {
            imageErrors += 1;
            return food;
          }
        })
      )
    : foodsData;

  const operations = seededFoods.map((food) => ({
    updateOne: {
      filter: {
        localName: food.localName,
        canonicalName: food.canonicalName || null,
      },
      update: {
        $set: {
          ...food,
          imageUrl: food.imageUrl || "",
          deleted: false,
        },
      },
      upsert: true,
    },
  }));

  const result = await FoodItem.bulkWrite(operations, { ordered: false });
  return {
    target: "foods",
    processed: seededFoods.length,
    created: result.upsertedCount || 0,
    updated: result.modifiedCount || 0,
    skipped: 0,
    imageSearch: {
      enabled: includeImages,
      source: "google-custom-search",
      updated: imageUpdated,
      skipped: imageSkipped,
      errors: imageErrors,
    },
  };
};

const seedRules = async ({ destructive = false, createdBy }) => {
  if (destructive) {
    await RuleTemplate.deleteMany({});
  }

  const operations = rulesData.map((rule) => ({
    updateOne: {
      filter: { slug: rule.slug },
      update: {
        $set: {
          ...rule,
          createdBy,
          deleted: false,
        },
      },
      upsert: true,
    },
  }));

  const result = await RuleTemplate.bulkWrite(operations, { ordered: false });
  return {
    target: "rules",
    processed: rulesData.length,
    created: result.upsertedCount || 0,
    updated: result.modifiedCount || 0,
    skipped: 0,
  };
};

const seedConfig = async () => {
  const maintenance = await settingsService.setMaintenanceMode(
    false,
    settingsService.DEFAULT_MAINTENANCE_MESSAGE
  );
  const appSettings = await settingsService.setAppSettings({
    supportPhone: settingsService.DEFAULT_SUPPORT_PHONE,
    googleFormLink: "https://forms.gle/exampleGluviaSupportForm",
  });

  await Config.findOneAndUpdate(
    { key: "defaultSeedTargets" },
    { value: DEFAULT_TARGETS },
    { upsert: true, new: true }
  );

  return {
    target: "config",
    processed: 3,
    created: 0,
    updated: 3,
    skipped: 0,
    maintenance,
    appSettings,
  };
};

const seedUsers = async () => {
  let created = 0;
  let skipped = 0;

  for (const demoUser of DEMO_USERS) {
    const existingUser = await User.findOne({ email: demoUser.email }).lean();
    if (existingUser) {
      skipped += 1;
      continue;
    }

    await User.create({
      email: demoUser.email,
      name: demoUser.name,
      role: demoUser.role,
      passwordHash: await hashPassword(demoUser.password),
      consent: {
        accepted: true,
        timestamp: new Date(),
      },
      profile: {
        language: "english",
        diabetesType: "type2",
        activityLevel: "moderate",
        incomeBracket: "middle",
      },
    });
    created += 1;
  }

  return {
    target: "users",
    processed: DEMO_USERS.length,
    created,
    updated: 0,
    skipped,
  };
};

const runSelectiveSeed = async ({
  targets,
  destructive = false,
  createdBy,
  includeImages = false,
}) => {
  const normalizedTargets = normalizeTargets(targets);
  const results = [];
  const errors = [];

  for (const target of normalizedTargets) {
    try {
      if (target === "foods") {
        results.push(await seedFoods({ destructive, includeImages }));
        continue;
      }

      if (target === "rules") {
        results.push(await seedRules({ destructive, createdBy }));
        continue;
      }

      if (target === "config") {
        results.push(await seedConfig());
        continue;
      }

      if (target === "users") {
        results.push(await seedUsers());
        continue;
      }

      errors.push({
        target,
        message: "Unsupported seed target",
      });
    } catch (error) {
      errors.push({
        target,
        message: error.message,
      });
    }
  }

  return {
    targets: normalizedTargets,
    mode: destructive ? "destructive" : "additive",
    results,
    errors,
    success: errors.length === 0,
  };
};

module.exports = {
  DEFAULT_TARGETS,
  getSeedPreview,
  runSelectiveSeed,
};
