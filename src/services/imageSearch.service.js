const { searchFoodImage } = require("../../seeds/utils/fetchFoodImage");

/**
 * Search for food image using AI-powered search
 * @param {string} foodName - Name of the food to search for
 * @param {boolean} useAI - Whether to use Gemini AI for optimization
 * @returns {Promise<Object>} - Image search results
 */
async function searchForFoodImage(foodName, useAI = true) {
  if (!foodName || typeof foodName !== "string") {
    throw new Error("Food name is required and must be a string");
  }

  const result = await searchFoodImage(foodName, useAI);
  return result;
}

module.exports = {
  searchForFoodImage,
};
