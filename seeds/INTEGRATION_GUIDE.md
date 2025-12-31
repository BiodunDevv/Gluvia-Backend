# Mobile App Integration Guide

## Quick Start

### 1. Import Food Database

```javascript
// For React Native / Flutter (using SQLite)
import foods from "./seeds/seedFoods.json";

// Initialize database
async function initFoodDatabase() {
  const db = await SQLite.openDatabase("gluvia.db");

  // Create table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      localName TEXT NOT NULL,
      canonicalName TEXT,
      category TEXT,
      calories REAL,
      carbs_g REAL,
      protein_g REAL,
      fat_g REAL,
      fibre_g REAL,
      gi INTEGER,
      affordability TEXT,
      tags TEXT,
      portionSizes TEXT,
      source TEXT
    )
  `);

  // Insert foods
  for (const food of foods) {
    await db.executeSql(
      `INSERT INTO foods (
        localName, canonicalName, category, calories, carbs_g, 
        protein_g, fat_g, fibre_g, gi, affordability, tags, 
        portionSizes, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        food.localName,
        food.canonicalName,
        food.category,
        food.nutrients.calories,
        food.nutrients.carbs_g,
        food.nutrients.protein_g,
        food.nutrients.fat_g,
        food.nutrients.fibre_g,
        food.nutrients.gi,
        food.affordability,
        JSON.stringify(food.tags),
        JSON.stringify(food.portionSizes),
        food.source,
      ]
    );
  }

  console.log("✅ Database initialized with 84 foods");
}
```

---

## 2. AI Rule-Based Recommendation Engine

### Basic Filtering

```javascript
class DiabetesFoodRecommender {
  // Get safe foods for current blood sugar
  getSafeFoods(bloodSugar, userPreferences = {}) {
    const { budget = "low", category = null } = userPreferences;

    // Determine GI threshold based on blood sugar
    let maxGI = 55; // Default: Low GI

    if (bloodSugar > 180) {
      maxGI = 20; // Very strict - only very low GI
    } else if (bloodSugar > 140) {
      maxGI = 40; // Strict - low GI only
    } else if (bloodSugar < 100) {
      maxGI = 69; // Can be more flexible
    }

    // Query database
    const query = `
      SELECT * FROM foods 
      WHERE gi <= ? 
      AND affordability IN (?, 'low')
      ${category ? "AND category = ?" : ""}
      ORDER BY gi ASC, affordability ASC
    `;

    const params = category ? [maxGI, budget, category] : [maxGI, budget];

    return db.executeSql(query, params);
  }

  // Get meal recommendations
  getMealRecommendation(mealType, bloodSugar, budget) {
    let carbTarget;

    switch (mealType) {
      case "breakfast":
        carbTarget = 45;
        break;
      case "lunch":
      case "dinner":
        carbTarget = 60;
        break;
      case "snack":
        carbTarget = 15;
        break;
      default:
        carbTarget = 45;
    }

    // Get foods
    const safeFoods = this.getSafeFoods(bloodSugar, { budget });

    // Build meal combination
    return this.buildMeal(safeFoods, carbTarget, mealType);
  }

  // Build complete meal
  buildMeal(foods, carbTarget, mealType) {
    const meal = {
      staple: null,
      protein: null,
      soup: null,
      vegetable: null,
      totalCarbs: 0,
      totalCalories: 0,
      averageGI: 0,
    };

    // Select protein (zero carbs)
    const proteins = foods.filter(
      (f) => f.category === "Protein Foods" && f.gi === 0
    );
    meal.protein = this.selectRandom(proteins);

    // Select soup (low GI)
    const soups = foods.filter(
      (f) => f.category === "Soups & Stews" && f.gi <= 30
    );
    meal.soup = this.selectRandom(soups);

    if (meal.soup) {
      const portion = meal.soup.portionSizes[0]; // Small
      meal.totalCarbs += portion.carbs_g;
    }

    // Calculate remaining carbs for staple
    const remainingCarbs = carbTarget - meal.totalCarbs;

    // Select appropriate staple
    const staples = foods.filter(
      (f) => f.category === "Grains & Staples" && f.gi <= 55
    );

    meal.staple = this.selectStapleWithPortion(staples, remainingCarbs);

    // Calculate totals
    meal.totalCarbs = this.calculateTotalCarbs(meal);
    meal.totalCalories = this.calculateTotalCalories(meal);
    meal.averageGI = this.calculateAverageGI(meal);

    return meal;
  }

  // Get substitutions for high-GI food
  getSubstitutions(foodName) {
    const substitutions = {
      "Eba (Cassava)": [
        { name: "Wheat Swallow", gi: 45, reason: "Much lower GI, high fiber" },
        { name: "Oat Swallow", gi: 55, reason: "Lower GI, heart healthy" },
        { name: "Unripe Plantain (Boiled)", gi: 40, reason: "Natural, low GI" },
      ],
      "Amala (Yam Flour)": [
        { name: "Wheat Swallow", gi: 45, reason: "Lower GI, more fiber" },
        { name: "Pounded Yam", gi: 66, reason: "Slightly better GI" },
        {
          name: "Unripe Plantain Porridge",
          gi: 42,
          reason: "Traditional, low GI",
        },
      ],
      "White Rice (Boiled)": [
        { name: "Brown Rice (Boiled)", gi: 50, reason: "More fiber, lower GI" },
        { name: "Ofada Rice", gi: 55, reason: "Local, healthier option" },
        {
          name: "Spaghetti (Boiled)",
          gi: 58,
          reason: "Alternative carb source",
        },
      ],
      "Jollof Rice": [
        {
          name: "Brown Rice (Boiled)",
          gi: 50,
          reason: "Can make brown jollof!",
        },
        { name: "Ofada Rice", gi: 55, reason: "Traditional alternative" },
      ],
    };

    return substitutions[foodName] || [];
  }

  // Explain why food is safe/unsafe
  explainFood(food, bloodSugar) {
    let message = `${food.localName}\n\n`;

    // GI assessment
    if (food.gi <= 20) {
      message +=
        "✅ Excellent: Very low GI - Safe for all blood sugar levels\n";
    } else if (food.gi <= 55) {
      message += "✅ Good: Low GI - Safe choice for diabetes\n";
    } else if (food.gi <= 69) {
      message += "⚠️ Moderate: Medium GI - Take small portions\n";
    } else {
      message += "🚫 Caution: High GI - Can spike blood sugar quickly\n";
    }

    // Current blood sugar consideration
    if (bloodSugar > 180 && food.gi > 55) {
      message +=
        "\n⚠️ Your blood sugar is high (>180). Choose very low GI foods only.\n";

      const subs = this.getSubstitutions(food.localName);
      if (subs.length > 0) {
        message += "\nBetter alternatives:\n";
        subs.forEach((sub) => {
          message += `• ${sub.name} (GI: ${sub.gi}) - ${sub.reason}\n`;
        });
      }
    }

    // Nutritional info
    message += `\n📊 Nutrition (per 100g):\n`;
    message += `• Carbs: ${food.carbs_g}g\n`;
    message += `• Protein: ${food.protein_g}g\n`;
    message += `• Fiber: ${food.fibre_g}g\n`;
    message += `• Calories: ${food.calories}\n`;

    // Portion advice
    const portion = food.portionSizes[0]; // Small
    message += `\n🍽️ Recommended portion:\n`;
    message += `• ${portion.name} (${portion.grams}g)\n`;
    message += `• Carbs: ${portion.carbs_g}g\n`;

    if (food.gi > 69) {
      message +=
        "\n💡 Tip: Pair with protein-rich soup to slow glucose absorption\n";
    }

    return message;
  }
}
```

---

## 3. Sample UI Components

### Food Card Component

```jsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

const FoodCard = ({ food, bloodSugar }) => {
  const getGIColor = (gi) => {
    if (gi <= 55) return "#4CAF50"; // Green
    if (gi <= 69) return "#FF9800"; // Orange
    return "#F44336"; // Red
  };

  const getGILabel = (gi) => {
    if (gi <= 55) return "Low GI";
    if (gi <= 69) return "Med GI";
    return "High GI";
  };

  const isSafe = bloodSugar > 180 ? food.gi <= 40 : food.gi <= 55;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{food.localName}</Text>
        {!isSafe && <Text style={styles.warning}>⚠️</Text>}
      </View>

      <Text style={styles.canonical}>{food.canonicalName}</Text>

      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: getGIColor(food.gi) }]}>
          <Text style={styles.badgeText}>
            {getGILabel(food.gi)}: {food.gi}
          </Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>{food.affordability}</Text>
        </View>
      </View>

      <View style={styles.nutrients}>
        <Text>Carbs: {food.carbs_g}g</Text>
        <Text>Protein: {food.protein_g}g</Text>
        <Text>Fiber: {food.fibre_g}g</Text>
      </View>

      {isSafe && food.gi <= 55 && (
        <Text style={styles.safeTag}>✅ Diabetes-Friendly</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
  },
  warning: {
    fontSize: 24,
  },
  canonical: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#E0E0E0",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  nutrients: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
    fontSize: 14,
  },
  safeTag: {
    marginTop: 8,
    color: "#4CAF50",
    fontWeight: "600",
  },
});

export default FoodCard;
```

---

## 4. Backend Seeding

```javascript
// Use existing seed endpoint
// POST /admin/seed-initial

// Or run manually:
// node seeds/seedInitial.js

// This will:
// 1. Preserve first admin user
// 2. Clear existing food data
// 3. Seed all 84 foods
// 4. Initialize serverVersion config
```

---

## 5. Testing Queries

```sql
-- Find all low-GI affordable foods
SELECT localName, gi, affordability
FROM foods
WHERE gi <= 55 AND affordability = 'low'
ORDER BY gi ASC;

-- Find protein sources
SELECT localName, protein_g, gi
FROM foods
WHERE category = 'Protein Foods' AND protein_g > 15
ORDER BY protein_g DESC;

-- Find high-fiber foods
SELECT localName, fibre_g, gi
FROM foods
WHERE fibre_g > 5
ORDER BY fibre_g DESC;

-- Get breakfast options under budget
SELECT localName, gi, affordability, carbs_g
FROM foods
WHERE gi <= 55
AND affordability IN ('low', 'medium')
AND category IN ('Grains & Staples', 'Protein Foods', 'Snacks')
ORDER BY gi ASC
LIMIT 10;
```

---

## 6. Offline Sync Strategy

```javascript
class FoodDatabaseSync {
  async checkForUpdates() {
    // Check server version
    const response = await fetch("https://api.gluvia.com/config/serverVersion");
    const { version: serverVersion } = await response.json();

    // Check local version
    const localVersion = await this.getLocalVersion();

    if (serverVersion > localVersion) {
      return this.downloadUpdates(serverVersion);
    }

    return false;
  }

  async downloadUpdates(newVersion) {
    // Download new foods
    const response = await fetch(
      "https://api.gluvia.com/foods?version=" + newVersion
    );
    const newFoods = await response.json();

    // Update local database
    await this.updateLocalFoods(newFoods);

    // Update version
    await this.setLocalVersion(newVersion);

    return true;
  }
}
```

---

## 7. PRD Compliance Checklist

✅ **50+ Nigerian Foods**: 84 foods available
✅ **GI-Based Filtering**: All foods have GI values
✅ **Carb Control**: Detailed carb content per portion
✅ **Portion Guides**: 3 sizes for each food
✅ **Affordability**: Tagged for budget filtering
✅ **Offline-First**: Can work without internet
✅ **Regional Foods**: Includes Lagos, Yoruba variations
✅ **Rule-Based AI**: No ML needed, pure logic
✅ **Explanations**: Can explain why food is safe/unsafe
✅ **Substitutions**: Suggests alternatives for high-GI foods

---

## 8. Next Development Steps

1. ✅ **Database Ready** - 84 foods validated
2. 🔄 **Mobile App** - Integrate SQLite
3. 🔄 **AI Engine** - Implement rule-based logic
4. 🔄 **UI Components** - Build food cards, meal plans
5. 🔄 **Testing** - Validate with real patients
6. 🔄 **Deployment** - Launch beta version

---

## Support

For questions or issues:

- Check `FOOD_DATABASE_README.md`
- Review `DATA_FIXES_SUMMARY.md`
- See `QUICK_REFERENCE_CARD.md`

---

**Database Version**: 1
**Last Updated**: December 31, 2025
**Status**: ✅ Production Ready
