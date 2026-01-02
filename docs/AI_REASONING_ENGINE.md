# Gluvia AI Reasoning Engine Documentation

## Overview

The Gluvia AI Reasoning Engine is a hybrid system that combines **prompt-based AI reasoning** with **rule-based dietary logic** to generate personalized, safe, and culturally relevant meal recommendations for diabetic users in Nigeria and Africa.

---

## 🧠 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GLUVIA AI REASONING ENGINE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   USER       │    │   HEALTH     │    │   CONTEXT    │                  │
│  │   PROFILE    │    │   DATA       │    │   DATA       │                  │
│  │              │    │              │    │              │                  │
│  │ • Age        │    │ • Glucose    │    │ • Time       │                  │
│  │ • Sex        │    │   Logs       │    │ • Location   │                  │
│  │ • Weight     │    │ • Meal Logs  │    │ • Budget     │                  │
│  │ • Height     │    │ • Trends     │    │ • Season     │                  │
│  │ • Diabetes   │    │ • Patterns   │    │ • Available  │                  │
│  │   Type       │    │              │    │   Foods      │                  │
│  │ • Allergies  │    │              │    │              │                  │
│  │ • Activity   │    │              │    │              │                  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                   │                          │
│         └───────────────────┼───────────────────┘                          │
│                             │                                              │
│                             ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    HYBRID REASONING LAYER                            │   │
│  │                                                                      │   │
│  │   ┌────────────────────┐       ┌────────────────────┐               │   │
│  │   │  RULE-BASED        │       │  AI PROMPT-BASED   │               │   │
│  │   │  ENGINE            │◄─────►│  REASONING         │               │   │
│  │   │                    │       │                    │               │   │
│  │   │  • GI Constraints  │       │  • GPT-4/Claude    │               │   │
│  │   │  • Carb Limits     │       │  • Context-Aware   │               │   │
│  │   │  • Portion Rules   │       │  • Explanation     │               │   │
│  │   │  • Safety Alerts   │       │  • Personalization │               │   │
│  │   │  • Substitutions   │       │  • Cultural Aware  │               │   │
│  │   └────────────────────┘       └────────────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                             │                                              │
│                             ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    OUTPUT GENERATION                                 │   │
│  │                                                                      │   │
│  │  • Personalized Meal Recommendations                                 │   │
│  │  • Safety Warnings & Alerts                                          │   │
│  │  • Natural Language Explanations                                     │   │
│  │  • Portion Size Guidance                                             │   │
│  │  • Alternative Suggestions                                           │   │
│  │  • Continuous Adaptation                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🍲 Nigerian/African Food Database

### Supported Foods

The system includes 84+ Nigerian and African foods with complete nutritional data:

| Category       | Examples                                                  |
| -------------- | --------------------------------------------------------- |
| **Swallows**   | Amala, Eba, Pounded Yam, Fufu, Semovita, Tuwo Shinkafa    |
| **Soups**      | Efo Riro, Egusi, Ogbono, Gbegiri, Ewedu, Okra, Banga      |
| **Proteins**   | Chicken, Fish (Tilapia, Mackerel), Beans, Eggs, Goat Meat |
| **Carbs**      | Jollof Rice, Fried Rice, Plantain, Yam, Potatoes          |
| **Vegetables** | Spinach, Ugu, Bitter Leaf, Garden Egg                     |
| **Snacks**     | Akara, Moi Moi, Puff Puff, Chin Chin                      |
| **Drinks**     | Zobo, Kunu, Palm Wine, Tiger Nut Milk                     |

### Food Data Structure

```javascript
{
  "localName": "Amala",
  "canonicalName": "Yam Flour Swallow",
  "category": "Swallows",
  "nutrients": {
    "calories": 150,
    "carbohydrates": 35,
    "protein": 2,
    "fat": 0.5,
    "fiber": 2,
    "glycemicIndex": 65,
    "glycemicLoad": 22
  },
  "portionSizes": [
    { "name": "small", "grams": 100, "description": "1 small wrap" },
    { "name": "medium", "grams": 200, "description": "1 medium wrap" },
    { "name": "large", "grams": 300, "description": "1 large wrap" }
  ],
  "affordability": "low",
  "tags": ["local", "traditional", "swallow"],
  "regionVariants": ["Southwest", "Lagos", "Oyo"]
}
```

---

## 📋 Rule-Based Engine

### Rule Types

The rule engine uses JSON DSL (Domain Specific Language) templates stored in the database:

#### 1. **Constraint Rules** - Hard limits that must not be exceeded

```javascript
{
  "slug": "daily-carb-limit",
  "title": "Daily Carbohydrate Limit",
  "type": "constraint",
  "definition": {
    "condition": {
      "field": "dailyCarbs",
      "operator": "<=",
      "value": {
        "diabetesType": {
          "type1": 150,
          "type2": 130,
          "prediabetes": 180
        }
      }
    },
    "action": "block",
    "severity": "high"
  },
  "nlTemplate": "Your daily carbohydrate intake should not exceed {{value}}g based on your {{diabetesType}} diabetes management plan."
}
```

#### 2. **GI Warning Rules** - Glycemic Index alerts

```javascript
{
  "slug": "high-gi-warning",
  "title": "High Glycemic Index Warning",
  "type": "alert",
  "definition": {
    "condition": {
      "field": "glycemicIndex",
      "operator": ">",
      "value": 70
    },
    "action": "warn",
    "severity": "medium"
  },
  "nlTemplate": "{{foodName}} has a high glycemic index ({{gi}}), which may cause rapid blood sugar spikes. Consider pairing with fiber-rich foods or choosing a lower-GI alternative."
}
```

#### 3. **Portion Adjustment Rules** - Dynamic portion recommendations

```javascript
{
  "slug": "portion-by-activity",
  "title": "Activity-Based Portion Adjustment",
  "type": "adjustment",
  "definition": {
    "condition": {
      "field": "activityLevel"
    },
    "adjustments": {
      "low": { "portionMultiplier": 0.8 },
      "moderate": { "portionMultiplier": 1.0 },
      "high": { "portionMultiplier": 1.2 }
    }
  },
  "nlTemplate": "Based on your {{activityLevel}} activity level, we recommend {{adjustedPortion}} portion sizes."
}
```

#### 4. **Substitution Rules** - Healthier alternatives

```javascript
{
  "slug": "white-rice-substitute",
  "title": "White Rice Alternative",
  "type": "substitution",
  "definition": {
    "trigger": {
      "food": "white-rice",
      "condition": {
        "or": [
          { "field": "diabetesType", "value": "type2" },
          { "field": "recentGlucose", "operator": ">", "value": 180 }
        ]
      }
    },
    "substitutes": [
      { "food": "ofada-rice", "reason": "Lower GI, more fiber" },
      { "food": "brown-rice", "reason": "Higher fiber content" },
      { "food": "cauliflower-rice", "reason": "Very low carb alternative" }
    ]
  },
  "nlTemplate": "Instead of white rice, try {{substituteName}} - {{reason}}"
}
```

#### 5. **Scoring Rules** - Meal suitability scores

```javascript
{
  "slug": "meal-suitability-score",
  "title": "Meal Suitability Scoring",
  "type": "scoring",
  "definition": {
    "factors": [
      { "field": "glycemicIndex", "weight": 0.3, "idealRange": [0, 55] },
      { "field": "fiberContent", "weight": 0.2, "idealRange": [5, 100] },
      { "field": "proteinRatio", "weight": 0.2, "idealRange": [0.2, 0.4] },
      { "field": "affordability", "weight": 0.15, "matchUserBudget": true },
      { "field": "culturalRelevance", "weight": 0.15, "matchUserRegion": true }
    ],
    "outputRange": [0, 100]
  },
  "nlTemplate": "This meal scores {{score}}/100 for your profile based on glycemic impact, nutrition balance, and affordability."
}
```

---

## 🤖 AI Prompt-Based Reasoning

### System Prompt Template

```javascript
const MEAL_RECOMMENDATION_PROMPT = `
You are Gluvia AI, a specialized diabetic nutrition assistant for Nigerian and African users.

## Your Role
Generate personalized, safe, and culturally relevant meal recommendations based on the user's health profile, dietary constraints, and available local foods.

## User Profile
- Name: {{userName}}
- Age: {{age}} years
- Sex: {{sex}}
- Diabetes Type: {{diabetesType}}
- Activity Level: {{activityLevel}}
- BMI: {{bmi}}
- Allergies: {{allergies}}
- Income Bracket: {{incomeBracket}}
- Preferred Language: {{language}}
- Region: {{region}}

## Recent Health Data
- Average Fasting Glucose (7 days): {{avgFastingGlucose}} mg/dL
- Average Post-meal Glucose (7 days): {{avgPostmealGlucose}} mg/dL
- Glucose Trend: {{glucoseTrend}} (rising/stable/falling)
- Recent Meals: {{recentMeals}}

## Dietary Rules Applied
{{appliedRules}}

## Available Local Foods
{{availableFoods}}

## Context
- Current Time: {{currentTime}}
- Meal Type: {{mealType}} (breakfast/lunch/dinner/snack)
- Budget Constraint: {{budgetLevel}}

## Instructions
1. Recommend 3-5 meal options suitable for this user
2. Prioritize local Nigerian/African foods (amala, beans, plantain, efo riro, etc.)
3. Explain WHY each meal is suitable for their specific condition
4. Include portion size recommendations
5. Highlight any warnings or considerations
6. Suggest affordable alternatives if relevant
7. Consider cultural preferences and regional availability

## Output Format
Provide recommendations in this JSON structure:
{
  "recommendations": [
    {
      "mealName": "string",
      "foods": [
        {
          "name": "string",
          "localName": "string",
          "portion": "string",
          "portionGrams": number
        }
      ],
      "totalNutrition": {
        "calories": number,
        "carbs": number,
        "protein": number,
        "fat": number,
        "fiber": number,
        "estimatedGI": number
      },
      "suitabilityScore": number,
      "explanation": "string (why this meal is good for the user)",
      "warnings": ["string"],
      "preparationTips": "string",
      "estimatedCost": "string (low/medium/high)"
    }
  ],
  "generalAdvice": "string",
  "nextMealSuggestion": "string"
}
`;
```

### Contextual Analysis Examples

#### Example 1: Type 2 Diabetic, Low Budget, Lagos

**Input Context:**

```javascript
{
  user: {
    diabetesType: "type2",
    activityLevel: "low",
    incomeBracket: "low",
    allergies: ["shellfish"],
    region: "Lagos"
  },
  recentGlucose: {
    avgFasting: 145,
    avgPostmeal: 195,
    trend: "rising"
  },
  mealType: "lunch",
  currentTime: "13:00"
}
```

**AI Response:**

```javascript
{
  "recommendations": [
    {
      "mealName": "Beans and Plantain with Vegetable Stew",
      "foods": [
        { "name": "Honey Beans", "localName": "Ewa Oloyin", "portion": "medium", "portionGrams": 150 },
        { "name": "Unripe Plantain", "localName": "Plantain", "portion": "2 pieces", "portionGrams": 120 },
        { "name": "Vegetable Stew", "localName": "Efo Riro", "portion": "1 ladle", "portionGrams": 100 }
      ],
      "totalNutrition": {
        "calories": 420,
        "carbs": 58,
        "protein": 18,
        "fat": 12,
        "fiber": 14,
        "estimatedGI": 48
      },
      "suitabilityScore": 92,
      "explanation": "This meal is excellent for your Type 2 diabetes management because: (1) Beans are high in fiber and protein, which slow glucose absorption, (2) Unripe plantain has a lower GI than ripe plantain, (3) The vegetable stew adds nutrients without significant carbs. Your recent glucose readings show a rising trend, so this low-GI meal will help stabilize your blood sugar.",
      "warnings": [
        "Monitor your glucose 2 hours after eating to track response"
      ],
      "preparationTips": "Cook the beans without adding sugar. Use minimal palm oil in the stew.",
      "estimatedCost": "low"
    },
    {
      "mealName": "Moi Moi with Garden Egg Sauce",
      "foods": [
        { "name": "Moi Moi", "localName": "Moi Moi", "portion": "2 wraps", "portionGrams": 200 },
        { "name": "Garden Egg Sauce", "localName": "Garden Egg", "portion": "1 serving", "portionGrams": 80 }
      ],
      "totalNutrition": {
        "calories": 340,
        "carbs": 42,
        "protein": 16,
        "fat": 14,
        "fiber": 8,
        "estimatedGI": 42
      },
      "suitabilityScore": 88,
      "explanation": "Moi Moi is a diabetic-friendly Nigerian staple made from beans. It's protein-rich, has a low glycemic index, and keeps you full longer. Garden egg is low in calories and adds beneficial fiber.",
      "warnings": [],
      "preparationTips": "Avoid adding too much oil when preparing. Steam rather than fry.",
      "estimatedCost": "low"
    },
    {
      "mealName": "Ofada Rice with Ayamase Sauce",
      "foods": [
        { "name": "Ofada Rice", "localName": "Ofada", "portion": "small", "portionGrams": 120 },
        { "name": "Ayamase (Green Pepper Sauce)", "localName": "Ayamase", "portion": "2 spoons", "portionGrams": 60 },
        { "name": "Boiled Egg", "localName": "Egg", "portion": "1 egg", "portionGrams": 50 }
      ],
      "totalNutrition": {
        "calories": 380,
        "carbs": 48,
        "protein": 14,
        "fat": 16,
        "fiber": 3,
        "estimatedGI": 52
      },
      "suitabilityScore": 78,
      "explanation": "Ofada rice has more fiber than white rice and a lower glycemic index. The protein from the egg will help slow glucose release. However, keep the portion small due to your rising glucose trend.",
      "warnings": [
        "Stick to small portion due to rising glucose trend",
        "Avoid adding extra locust beans (iru) if you're watching sodium"
      ],
      "preparationTips": "Measure your rice portion before cooking. Don't add sugar to the sauce.",
      "estimatedCost": "medium"
    }
  ],
  "generalAdvice": "Your recent glucose readings show a rising trend (avg postmeal: 195 mg/dL). Focus on high-fiber, protein-rich meals this week. Consider taking a 15-minute walk after meals to help lower post-meal glucose spikes.",
  "nextMealSuggestion": "For dinner, consider a light soup like Okra or Ewedu with a small portion of protein. Avoid heavy swallows tonight."
}
```

---

## 🔄 Continuous Adaptation System

### How the System Learns and Adapts

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONTINUOUS ADAPTATION LOOP                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐                                                   │
│   │  USER LOGS   │                                                   │
│   │  MEAL        │                                                   │
│   └──────┬───────┘                                                   │
│          │                                                           │
│          ▼                                                           │
│   ┌──────────────┐      ┌──────────────┐                            │
│   │  GLUCOSE     │ ──── │  CORRELATION │                            │
│   │  RESPONSE    │      │  ANALYSIS    │                            │
│   │  (2hr post)  │      │              │                            │
│   └──────────────┘      └──────┬───────┘                            │
│                                │                                     │
│                                ▼                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                  PERSONAL FOOD RESPONSE MODEL                │   │
│   │                                                              │   │
│   │  "When this user eats Amala + Efo Riro (200g),              │   │
│   │   their glucose typically rises by 45 mg/dL"                 │   │
│   │                                                              │   │
│   │  "When this user eats Beans + Plantain (300g),              │   │
│   │   their glucose typically rises by 25 mg/dL"                 │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                │                                     │
│                                ▼                                     │
│   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐     │
│   │  ADJUST      │      │  PERSONALIZE │      │  IMPROVE     │     │
│   │  PORTIONS    │      │  WARNINGS    │      │  RECOMMEN-   │     │
│   │              │      │              │      │  DATIONS     │     │
│   └──────────────┘      └──────────────┘      └──────────────┘     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Adaptation Triggers

1. **Health Profile Updates**
   - User changes diabetes type, weight, activity level
   - System immediately recalculates all rules and recommendations

2. **Glucose Pattern Detection**
   - System analyzes 7-day, 14-day, 30-day glucose trends
   - Detects patterns: "User's glucose spikes more after evening meals"
   - Adjusts evening meal recommendations accordingly

3. **Food Response Learning**
   - Tracks individual response to specific foods
   - Builds personal glycemic response model
   - Example: "Amala affects this user more than average"

4. **Seasonal/Contextual Adaptation**
   - Adjusts recommendations based on:
     - Ramadan fasting periods
     - Harmattan season (dehydration risks)
     - Festive periods (special meals)

---

## 🛡️ Safety System

### Multi-Layer Safety Checks

```javascript
const SAFETY_CHECKS = {
  // Layer 1: Hard Blocks
  hardBlocks: [
    {
      condition: "bloodGlucose > 400",
      action: "BLOCK_ALL_RECOMMENDATIONS",
      message:
        "Your glucose level is critically high. Please seek immediate medical attention.",
      escalation: "EMERGENCY",
    },
    {
      condition: "bloodGlucose < 70",
      action: "RECOMMEND_FAST_CARBS",
      message:
        "Your glucose is low. Please consume 15g of fast-acting carbs immediately (glucose tablets, juice, or sugar).",
      escalation: "URGENT",
    },
  ],

  // Layer 2: Allergy Protection
  allergyProtection: {
    enabled: true,
    action: "EXCLUDE_AND_WARN",
    message:
      "Foods containing {{allergen}} have been excluded from recommendations due to your allergy profile.",
  },

  // Layer 3: Drug Interactions
  drugInteractions: [
    {
      drug: "metformin",
      foods: ["alcohol", "excessive-fiber"],
      warning:
        "High fiber intake may affect Metformin absorption. Space meals and medication appropriately.",
    },
    {
      drug: "sulfonylureas",
      condition: "skipped_meal",
      warning:
        "Missing meals while on sulfonylureas can cause dangerous low blood sugar. Please eat regularly.",
    },
  ],

  // Layer 4: Contextual Warnings
  contextualWarnings: [
    {
      condition: "time > 21:00 && mealType == 'heavy'",
      warning:
        "Late heavy meals may affect your fasting glucose tomorrow. Consider a lighter option.",
    },
    {
      condition: "recentExercise && glucoseLevel < 100",
      warning:
        "Your glucose is on the lower side after exercise. This meal should include adequate carbs.",
    },
  ],
};
```

### Safety Response Examples

```javascript
// Critical High Glucose
{
  "safety": {
    "level": "CRITICAL",
    "action": "MEDICAL_ATTENTION_REQUIRED",
    "message": "Your blood glucose reading of 420 mg/dL is dangerously high. Do not eat until you've consulted a healthcare provider. Consider going to the nearest hospital emergency room.",
    "recommendations": null,
    "emergencyContacts": true
  }
}

// Low Glucose (Hypoglycemia)
{
  "safety": {
    "level": "URGENT",
    "action": "CONSUME_FAST_CARBS",
    "message": "Your glucose is 65 mg/dL (low). Follow the 15-15 rule: Consume 15g of fast-acting carbs now, wait 15 minutes, and recheck.",
    "recommendations": [
      { "item": "3-4 glucose tablets", "carbs": 15 },
      { "item": "1/2 cup fruit juice", "carbs": 15 },
      { "item": "1 tablespoon honey", "carbs": 17 },
      { "item": "Regular soft drink (not diet)", "carbs": 15 }
    ],
    "followUp": "After your glucose normalizes, eat a balanced snack with protein to prevent another drop."
  }
}
```

---

## 📱 API Endpoints

### Meal Recommendation Endpoint

```
POST /api/v1/recommendations/meal
```

**Request:**

```javascript
{
  "mealType": "lunch",           // breakfast, lunch, dinner, snack
  "currentGlucose": 145,         // optional, mg/dL
  "preferences": {
    "maxCarbs": 50,              // optional
    "excludeFoods": ["pork"],    // optional
    "budget": "low",             // low, medium, high
    "cookingTime": "quick"       // quick (<30min), medium, elaborate
  },
  "context": {
    "recentExercise": false,
    "fasting": false,
    "specialOccasion": null
  }
}
```

**Response:**

```javascript
{
  "success": true,
  "data": {
    "recommendations": [...],
    "rulesApplied": [
      { "rule": "daily-carb-limit", "status": "passed" },
      { "rule": "high-gi-warning", "status": "triggered", "foods": ["white rice"] }
    ],
    "safetyChecks": {
      "passed": true,
      "warnings": []
    },
    "personalInsights": {
      "glucoseTrend": "rising",
      "advice": "Your glucose has been trending up this week. Focus on lower-GI options."
    }
  }
}
```

### Food Analysis Endpoint

```
POST /api/v1/recommendations/analyze-meal
```

**Request:**

```javascript
{
  "foods": [
    { "foodId": "amala-123", "portionGrams": 200 },
    { "foodId": "efo-riro-456", "portionGrams": 150 },
    { "foodId": "fish-789", "portionGrams": 100 }
  ]
}
```

**Response:**

```javascript
{
  "success": true,
  "data": {
    "analysis": {
      "totalNutrition": {
        "calories": 520,
        "carbs": 65,
        "protein": 28,
        "fat": 18,
        "fiber": 8
      },
      "estimatedGlycemicImpact": {
        "glycemicLoad": 32,
        "expectedGlucoseRise": "45-65 mg/dL",
        "peakTime": "45-60 minutes"
      },
      "suitabilityScore": 72,
      "verdict": "ACCEPTABLE_WITH_CAUTION"
    },
    "warnings": [
      {
        "type": "PORTION_WARNING",
        "message": "The Amala portion (200g) is larger than recommended for your profile. Consider reducing to 150g.",
        "severity": "medium"
      }
    ],
    "suggestions": [
      "Add more vegetables to increase fiber and slow glucose absorption",
      "Consider reducing Amala portion by 25%"
    ],
    "alternatives": [
      {
        "original": "Amala (200g)",
        "suggested": "Amala (150g) + extra Efo Riro (50g)",
        "benefit": "Reduces carbs by 12g while maintaining satisfaction"
      }
    ]
  }
}
```

---

## 🔧 Implementation Guide

### Step 1: Set Up Rule Engine Service

```javascript
// src/services/ruleEngine.service.js

const RuleTemplate = require("../models/ruleTemplate.model");

class RuleEngine {
  constructor() {
    this.rules = [];
  }

  async loadRules() {
    this.rules = await RuleTemplate.find({ active: true });
  }

  evaluateRules(context) {
    const results = {
      passed: [],
      warnings: [],
      blocked: [],
      adjustments: [],
    };

    for (const rule of this.rules) {
      const evaluation = this.evaluateRule(rule, context);

      switch (evaluation.status) {
        case "passed":
          results.passed.push(rule.slug);
          break;
        case "warning":
          results.warnings.push({
            rule: rule.slug,
            message: this.generateMessage(rule, context),
          });
          break;
        case "blocked":
          results.blocked.push({
            rule: rule.slug,
            message: this.generateMessage(rule, context),
          });
          break;
        case "adjustment":
          results.adjustments.push({
            rule: rule.slug,
            adjustment: evaluation.adjustment,
          });
          break;
      }
    }

    return results;
  }

  evaluateRule(rule, context) {
    const { definition } = rule;

    switch (rule.type) {
      case "constraint":
        return this.evaluateConstraint(definition, context);
      case "alert":
        return this.evaluateAlert(definition, context);
      case "adjustment":
        return this.evaluateAdjustment(definition, context);
      case "substitution":
        return this.evaluateSubstitution(definition, context);
      case "scoring":
        return this.evaluateScoring(definition, context);
      default:
        return { status: "passed" };
    }
  }

  evaluateConstraint(definition, context) {
    const { condition, action } = definition;
    const fieldValue = this.getFieldValue(condition.field, context);
    const threshold = this.getThresholdValue(condition.value, context);

    const passed = this.compareValues(
      fieldValue,
      condition.operator,
      threshold
    );

    return {
      status: passed ? "passed" : action === "block" ? "blocked" : "warning",
    };
  }

  generateMessage(rule, context) {
    let message = rule.nlTemplate;

    // Replace template variables with actual values
    const variables = message.match(/\{\{(\w+)\}\}/g) || [];
    for (const variable of variables) {
      const key = variable.replace(/\{\{|\}\}/g, "");
      const value = this.getFieldValue(key, context);
      message = message.replace(variable, value);
    }

    return message;
  }

  // ... additional helper methods
}

module.exports = new RuleEngine();
```

### Step 2: Set Up AI Reasoning Service

```javascript
// src/services/aiReasoning.service.js

const OpenAI = require("openai");
const config = require("../config");
const ruleEngine = require("./ruleEngine.service");
const FoodItem = require("../models/food.model");
const User = require("../models/user.model");
const GlucoseLog = require("../models/glucoseLog.model");
const MealLog = require("../models/mealLog.model");

class AIReasoningService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }

  async generateMealRecommendation(userId, options) {
    // 1. Gather user context
    const context = await this.buildUserContext(userId, options);

    // 2. Run rule engine
    const ruleResults = ruleEngine.evaluateRules(context);

    // 3. Check safety
    const safetyCheck = this.performSafetyCheck(context);
    if (safetyCheck.blocked) {
      return safetyCheck.response;
    }

    // 4. Get available foods
    const availableFoods = await this.getAvailableFoods(context);

    // 5. Build AI prompt
    const prompt = this.buildPrompt(
      context,
      ruleResults,
      availableFoods,
      options
    );

    // 6. Get AI response
    const aiResponse = await this.callAI(prompt);

    // 7. Validate and enhance response
    const finalResponse = this.validateAndEnhance(
      aiResponse,
      ruleResults,
      context
    );

    return finalResponse;
  }

  async buildUserContext(userId, options) {
    const user = await User.findById(userId);
    const recentGlucose = await GlucoseLog.find({ userId })
      .sort({ timestamp: -1 })
      .limit(14);
    const recentMeals = await MealLog.find({ userId })
      .sort({ timestamp: -1 })
      .limit(7)
      .populate("entries.foodId");

    return {
      user: {
        name: user.name,
        age: user.profile.age,
        sex: user.profile.sex,
        diabetesType: user.profile.diabetesType,
        activityLevel: user.profile.activityLevel,
        bmi: user.profile.bmi,
        allergies: user.profile.allergies || [],
        incomeBracket: user.profile.incomeBracket,
        language: user.profile.language,
      },
      glucose: this.analyzeGlucoseData(recentGlucose),
      meals: this.analyzeMealHistory(recentMeals),
      options,
    };
  }

  analyzeGlucoseData(glucoseLogs) {
    const fasting = glucoseLogs.filter((l) => l.type === "fasting");
    const postmeal = glucoseLogs.filter((l) => l.type === "postprandial");

    return {
      avgFasting: this.average(fasting.map((l) => l.value)),
      avgPostmeal: this.average(postmeal.map((l) => l.value)),
      trend: this.calculateTrend(glucoseLogs),
      lastReading: glucoseLogs[0]?.value,
    };
  }

  calculateTrend(logs) {
    if (logs.length < 3) return "insufficient_data";

    const recent = logs.slice(0, 3);
    const older = logs.slice(3, 7);

    const recentAvg = this.average(recent.map((l) => l.value));
    const olderAvg = this.average(older.map((l) => l.value));

    const diff = recentAvg - olderAvg;

    if (diff > 10) return "rising";
    if (diff < -10) return "falling";
    return "stable";
  }

  performSafetyCheck(context) {
    const glucose = context.glucose.lastReading;

    // Critical high
    if (glucose > 400) {
      return {
        blocked: true,
        response: {
          safety: {
            level: "CRITICAL",
            action: "SEEK_MEDICAL_ATTENTION",
            message:
              "Your glucose reading is critically high. Please seek immediate medical attention.",
          },
        },
      };
    }

    // Hypoglycemia
    if (glucose < 70) {
      return {
        blocked: true,
        response: {
          safety: {
            level: "URGENT",
            action: "TREAT_HYPOGLYCEMIA",
            message:
              "Your glucose is low. Please consume 15g of fast-acting carbs immediately.",
            recommendations: this.getHypoglycemiaTreatment(),
          },
        },
      };
    }

    return { blocked: false };
  }

  async callAI(prompt) {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  }

  // ... additional methods
}

module.exports = new AIReasoningService();
```

### Step 3: Create Recommendation Controller

```javascript
// src/controllers/recommendation.controller.js

const aiReasoningService = require("../services/aiReasoning.service");
const { asyncHandler } = require("../middlewares/error.middleware");

const getMealRecommendation = asyncHandler(async (req, res) => {
  const { mealType, currentGlucose, preferences, context } = req.body;

  const recommendation = await aiReasoningService.generateMealRecommendation(
    req.userId,
    {
      mealType,
      currentGlucose,
      preferences,
      context,
    }
  );

  res.json({
    success: true,
    message: "Meal recommendations generated successfully",
    data: recommendation,
  });
});

const analyzeMeal = asyncHandler(async (req, res) => {
  const { foods } = req.body;

  const analysis = await aiReasoningService.analyzeMeal(req.userId, foods);

  res.json({
    success: true,
    message: "Meal analysis completed",
    data: analysis,
  });
});

module.exports = {
  getMealRecommendation,
  analyzeMeal,
};
```

---

## 📊 Performance Metrics

### Key Performance Indicators

| Metric                 | Target | Description                                 |
| ---------------------- | ------ | ------------------------------------------- |
| **Response Time**      | < 3s   | Time to generate recommendations            |
| **Accuracy**           | > 85%  | User satisfaction with recommendations      |
| **Safety**             | 100%   | All safety rules properly enforced          |
| **Personalization**    | > 90%  | Recommendations match user profile          |
| **Cultural Relevance** | > 95%  | Foods are locally available and appropriate |

### Monitoring Dashboard

Track these metrics in real-time:

- Recommendation generation success rate
- Rule engine evaluation times
- AI API response times
- User feedback scores
- Safety alert frequency

---

## 🔒 Privacy & Compliance

### Data Handling

1. **NDPR Compliance** (Nigeria Data Protection Regulation)
   - All health data encrypted at rest and in transit
   - Users can export all their data
   - Users can delete their account and all associated data

2. **AI Data Usage**
   - User data sent to AI is anonymized where possible
   - No personal identifiers sent to external AI services
   - AI responses are logged for quality improvement (opt-out available)

3. **Health Data Security**
   - Glucose and meal logs stored with encryption
   - Access logs maintained for audit
   - Regular security assessments

---

## 🚀 Future Enhancements

### Planned Features

1. **Voice Interface**
   - "Gluvia, what should I eat for dinner?"
   - Natural language meal logging

2. **Image Recognition**
   - Take photo of meal for automatic logging
   - Portion size estimation from images

3. **Wearable Integration**
   - Continuous Glucose Monitor (CGM) integration
   - Real-time alerts and recommendations

4. **Community Features**
   - Share successful meal combinations
   - Regional recipe database with diabetic modifications

5. **Healthcare Provider Portal**
   - Doctors can view patient meal and glucose data
   - Remote monitoring and intervention

---

## 📚 References

- Nigerian Food Composition Table
- International Tables of Glycemic Index and Glycemic Load Values
- American Diabetes Association Nutrition Guidelines
- WHO Guidelines on Sugar Intake for Adults and Children

---

**Built with ❤️ for better diabetes management in Africa**
