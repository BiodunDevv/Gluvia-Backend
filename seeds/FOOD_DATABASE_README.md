# Diabetes-Friendly Nigerian Food Database

## Overview

Comprehensive food database designed for diabetic patients in South West Nigeria, aligned with PRD requirements.

## Database Statistics

### Total Foods: **84**

### Category Distribution

- **Grains & Staples**: 21 foods
- **Fruits & Vegetables**: 20 foods
- **Soups & Stews**: 13 foods
- **Protein Foods**: 13 foods
- **Snacks**: 11 foods
- **Beverages**: 3 foods
- **Dairy**: 2 foods
- **Fats & Oils**: 1 food

### Glycemic Index (GI) Distribution

- **Very Low GI (0-15)**: 31 foods - Excellent for diabetes management
- **Low GI (16-55)**: 31 foods - Good for diabetes patients
- **Medium GI (56-69)**: 12 foods - Moderate, portion control needed
- **High GI (70+)**: 10 foods - Requires careful monitoring

### Diabetes-Friendly Characteristics

- **Protein-Rich Foods (>10g)**: 22 foods - Essential for blood sugar control
- **High-Fiber Foods (>4g)**: 19 foods - Slows glucose absorption
- **Low-Carb Foods (<10g)**: 34 foods - Safe for diabetic patients

### Affordability

- **Low**: 52 foods (62%) - Accessible to low-income patients
- **Medium**: 31 foods (37%)
- **High**: 1 food (1%)

## PRD Compliance

### ✅ Requirements Met:

1. **50+ Nigerian Meals**: 84 foods covering South West Nigerian cuisine
2. **GI-Based Rules**: All foods have GI values for filtering
3. **Carb Control**: Detailed carb content per portion
4. **Protein & Fibre**: Complete macronutrient data
5. **Portion Guides**: 3 portion sizes (small, medium, large) per food
6. **Affordability Tags**: Low/medium/high ratings
7. **Regional Foods**: Includes amala, moi-moi, jollof, eba, etc.

## Key Diabetes-Friendly Foods

### Low-GI Staples

- Unripe Plantain (Boiled) - GI: 40
- Brown Rice (Boiled) - GI: 50
- Oatmeal (Prepared) - GI: 55
- Wheat Swallow - GI: 45
- Oat Swallow - GI: 55

### Protein Sources (Zero GI)

- Chicken (Grilled)
- Fish (Tilapia, Grilled)
- Catfish (Grilled)
- Mackerel (Tinned) - Affordable
- Sardines (Tinned) - Affordable
- Eggs (Boiled)
- Snail Meat
- Turkey (Grilled)

### Low-GI Soups (Excellent for Diabetes)

- Egusi Soup - GI: 15
- Okra Soup - GI: 20
- Ogbono Soup - GI: 20
- Efo Riro - GI: 20
- Vegetable Soup (Ewedu) - GI: 15
- Bitterleaf Soup - GI: 18

### Vegetables (Very Low GI)

- Ugu (Pumpkin Leaves) - GI: 15
- Spinach (Nigerian) - GI: 15
- Cucumber - GI: 15
- Cabbage - GI: 10
- Garden Egg - GI: 15
- Tomatoes - GI: 15

### Diabetes-Friendly Fruits

- Guava - GI: 12 (High fibre!)
- Avocado Pear - GI: 15 (Healthy fats)
- Orange - GI: 43
- Banana - GI: 51

### Affordable Snacks

- Groundnuts (Peanuts) - GI: 14, Low cost
- Boiled Corn - GI: 52, Low cost
- Bitter Kola - GI: 35, Medicinal properties

## Traditional Nigerian Foods

### Yoruba/South West Specialties

- Amala (Yam Flour) - GI: 77 (portion control needed)
- Ewedu Soup - GI: 15
- Gbegiri Soup - GI: 30
- Efo Riro - GI: 20
- Ofada Rice - GI: 55

### Swallow Options (Ranked by GI)

1. Wheat Swallow - GI: 45 ✅ Best choice
2. Oat Swallow - GI: 55 ✅ Good choice
3. Pounded Yam - GI: 66 ⚠️ Moderate
4. Amala - GI: 77 ⚠️ Limit portions
5. Fufu - GI: 80 ⚠️ Limit portions
6. Eba - GI: 85 ⚠️ Use sparingly

## Meal Planning Examples

### Low-GI Breakfast Options

- Oatmeal + Banana + Groundnuts
- Boiled Eggs + Unripe Plantain + Avocado
- Moi Moi + Pap (small portion)
- Akara (2 pieces) + Custard

### Low-GI Lunch/Dinner

- Wheat Swallow + Egusi Soup + Grilled Fish
- Brown Rice + Efo Riro + Grilled Chicken
- Unripe Plantain Porridge + Mackerel
- Ofada Rice + Bitterleaf Soup + Snail Meat

### Diabetes-Safe Snacks

- Groundnuts (small handful)
- Boiled Corn (1 cob)
- Cucumber Salad
- Greek Yogurt
- Carrot sticks
- Garden Egg

## AI Rule-Based Filtering Logic

### GI Thresholds for Recommendations

- **Excellent (<55)**: Primary recommendations
- **Good (55-69)**: With portion warnings
- **Caution (70-85)**: Small portions only
- **Avoid (>85)**: Alternative suggestions

### Carb Limits Per Meal

- **Breakfast**: 30-45g carbs
- **Lunch**: 45-60g carbs
- **Dinner**: 45-60g carbs
- **Snacks**: 15-20g carbs

### Portion Control Rules

- High-GI foods: Recommend "Small" portions only
- Medium-GI foods: Recommend "Small" or "Medium" portions
- Low-GI foods: All portions acceptable
- Always pair high-carb with protein/fibre

## Usage in AI Engine

### Example Filtering Query

```javascript
// Find breakfast foods for Type 2 diabetic, pre-meal glucose 140mg/dL
const foods = await FoodItem.find({
  "nutrients.gi": { $lt: 55 },
  "nutrients.carbs_g": { $lt: 15 },
  affordability: { $in: ["low", "medium"] },
  category: { $in: ["Protein Foods", "Fruits & Vegetables"] },
});
```

### Example Substitution Logic

```javascript
// User requests: "I want to eat eba"
// AI Response:
// Eba has high GI (85). Consider these alternatives:
// - Wheat Swallow (GI: 45) - Better for blood sugar
// - Unripe Plantain (GI: 40) - Lower GI, more fibre
// - If you must eat eba, take small portion (100g) with protein-rich soup
```

## Data Sources

- **Source Types**: Validated, Manual, Estimated
- **Validation**: Based on Nigerian Food Composition Tables and international databases
- **Portion Sizes**: Culturally appropriate Nigerian serving sizes

## Updates & Maintenance

- Database version: 1
- Can be updated via API: `POST /admin/seed-initial`
- Preserves first admin during database reset

## Regional Variants

Many foods include regional notes:

- Lagos preparations
- Yoruba traditional methods
- Ogun/Oyo variations

## Next Steps for AI Integration

1. Implement GI-based filtering rules
2. Create carb-counting logic
3. Add substitution engine
4. Build meal combination validator
5. Implement affordability filters based on user income
6. Add allergy exclusion logic

---

**For Development Team**: This database serves as the foundation for the offline rule-based AI recommendation system described in the PRD. All foods include the required attributes for intelligent meal planning.
