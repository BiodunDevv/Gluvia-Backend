const axios = require("axios");
const { GoogleGenAI } = require("@google/genai");
const config = require("../../src/config");

// Initialize Gemini AI with the correct API key
const ai = new GoogleGenAI({ apiKey: config.google.geminiApiKey });

/**
 * Use Gemini AI to generate optimized search query for food images
 * @param {string} foodName - Name of the food
 * @returns {Promise<string>} - Optimized search query
 */
async function generateOptimizedSearchQuery(foodName) {
  try {
    const prompt = `Given a food name "${foodName}", generate the best Google Images search query to find a high-quality, authentic photo of this food. 
    
    Rules:
    - If it's a Nigerian or African food, include "Nigerian" or "African" in the query
    - Keep it concise (2-4 words)
    - Focus on getting realistic food photography
    - Return ONLY the search query, no explanations
    
    Food: ${foodName}
    Search Query:`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const searchQuery = response.text.trim().replace(/['"]/g, "");

    console.log(`🤖 Gemini optimized: "${foodName}" → "${searchQuery}"`);
    return searchQuery;
  } catch (error) {
    const errorMsg = error.message || JSON.stringify(error);
    if (errorMsg.includes("429") || errorMsg.includes("quota")) {
      console.warn(`⚠️  Gemini rate limit reached, skipping optimization`);
    } else {
      console.warn(
        `⚠️  Gemini optimization failed: ${errorMsg.substring(0, 100)}`
      );
    }
    // Fallback to basic optimization
    const cleanName = foodName.replace(/\(.*?\)/g, "").trim();
    return `${cleanName} Nigerian food`;
  }
}

/**
 * Search Google Images using Custom Search API
 * @param {string} searchQuery - Search query
 * @returns {Promise<string|null>} - Image URL or null
 */
async function searchGoogleImages(searchQuery) {
  try {
    const googleApiKey = config.google.customSearchApiKey;
    const searchEngineId = config.google.customSearchEngineId;

    if (!googleApiKey || !searchEngineId) {
      console.warn(`⚠️  Google Custom Search not configured`);
      return null;
    }

    const response = await axios.get(
      "https://www.googleapis.com/customsearch/v1",
      {
        params: {
          key: googleApiKey,
          cx: searchEngineId,
          q: searchQuery,
          searchType: "image",
          num: 1,
          imgSize: "large",
          safe: "active",
        },
        timeout: 10000,
      }
    );

    if (response.data.items && response.data.items.length > 0) {
      const imageUrl = response.data.items[0].link;
      console.log(`✅ Found Google image for "${searchQuery}"`);
      return imageUrl;
    }

    console.warn(`⚠️  No Google images found for "${searchQuery}"`);
    return null;
  } catch (error) {
    const errorMsg = error.message || JSON.stringify(error);
    if (
      errorMsg.includes("429") ||
      errorMsg.includes("quota") ||
      errorMsg.includes("rateLimitExceeded")
    ) {
      console.warn(`⚠️  Google Search rate limit reached`);
    } else {
      console.warn(
        `⚠️  Google Images search failed: ${errorMsg.substring(0, 100)}`
      );
    }
    return null;
  }
}

/**
 * Get curated Nigerian food images (now just marks priority foods, uses Google Search)
 * @param {string} foodName - Name of the food
 * @returns {string|null} - Returns null (will use Google Search for all)
 */
function getCuratedNigerianFoodImage(foodName) {
  // List of priority Nigerian foods - but we'll still search for them via Google
  // This list helps prioritize which foods to search first
  const nigerianFoods = [
    "Jollof Rice",
    "Eba",
    "Egusi Soup",
    "Moi Moi",
    "Plantain",
    "Suya",
    "Pounded Yam",
    "Akara",
    "Dodo",
    "Chin Chin",
    "Fufu",
    "Ogbono Soup",
    "Efo Riro",
    "Amala",
  ];

  // Always return null to force Google Custom Search for all foods
  return null;
}

/**
 * Main function to fetch food image with AI-powered Google search
 * @param {string} foodName - Name of the food
 * @param {boolean} useAI - Whether to use Gemini AI for query optimization (default: true)
 * @returns {Promise<string>} - Image URL or empty string if not found
 */
async function fetchFoodImage(foodName, useAI = true) {
  try {
    console.log(`🔍 Fetching image for: ${foodName}`);

    // Use Gemini AI to optimize search query
    let searchQuery;
    if (useAI) {
      searchQuery = await generateOptimizedSearchQuery(foodName);
    } else {
      const cleanName = foodName.replace(/\(.*?\)/g, "").trim();
      searchQuery = `${cleanName} Nigerian food`;
    }

    // Try Google Custom Search
    const googleImage = await searchGoogleImages(searchQuery);
    if (googleImage) {
      return googleImage;
    }

    // No image found - return empty string to be updated later
    console.log(
      `⚠️  No image found for ${foodName}, leaving empty for manual update`
    );
    return "";
  } catch (error) {
    console.error(`❌ Error fetching image for ${foodName}:`, error.message);
    return ""; // Return empty string on error
  }
}

/**
 * Search for food image with detailed results (for API endpoint)
 * @param {string} foodName - Name of the food
 * @param {boolean} useAI - Whether to use Gemini AI
 * @returns {Promise<Object>} - Detailed search results
 */
async function searchFoodImage(foodName, useAI = true) {
  try {
    const result = {
      foodName: foodName,
      searchQuery: null,
      imageUrl: null,
      source: null,
      usedAI: useAI,
      error: null,
    };

    // Generate search query with Gemini AI
    if (useAI) {
      result.searchQuery = await generateOptimizedSearchQuery(foodName);
    } else {
      const cleanName = foodName.replace(/\(.*?\)/g, "").trim();
      result.searchQuery = `${cleanName} Nigerian food`;
    }

    // Try Google Custom Search
    const googleImage = await searchGoogleImages(result.searchQuery);
    if (googleImage) {
      result.imageUrl = googleImage;
      result.source = "google";
      return result;
    }

    // No image found - mark as failed
    result.imageUrl = "";
    result.source = "none";
    result.error = "No image found or API rate limit reached";
    return result;
  } catch (error) {
    console.error(
      `❌ Error in searchFoodImage for ${foodName}:`,
      error.message
    );
    return {
      foodName: foodName,
      searchQuery: null,
      imageUrl: "",
      source: "none",
      usedAI: false,
      error: error.message,
    };
  }
}

/**
 * Batch fetch images for multiple foods with rate limiting
 * @param {Array<{localName: string}>} foods - Array of food objects
 * @param {number} delayMs - Delay between requests in milliseconds
 * @param {boolean} useAI - Whether to use Gemini AI
 * @returns {Promise<Array<{name: string, imageUrl: string}>>}
 */
async function batchFetchFoodImages(foods, delayMs = 500, useAI = true) {
  const results = [];

  console.log(
    `🚀 Starting batch image fetch for ${foods.length} foods (AI: ${useAI ? "enabled" : "disabled"})`
  );

  for (let i = 0; i < foods.length; i++) {
    const food = foods[i];
    const imageUrl = await fetchFoodImage(food.localName, useAI);

    results.push({
      name: food.localName,
      imageUrl: imageUrl,
    });

    if ((i + 1) % 10 === 0) {
      console.log(`📊 Progress: ${i + 1}/${foods.length} images fetched`);
    }

    // Add delay between requests to avoid rate limits
    if (i < foods.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log(`🎉 Completed fetching ${results.length} images`);
  return results;
}

module.exports = {
  fetchFoodImage,
  searchFoodImage,
  batchFetchFoodImages,
  getCuratedNigerianFoodImage,
  generateOptimizedSearchQuery,
};
