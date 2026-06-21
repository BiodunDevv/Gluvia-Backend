const axios = require("axios");
const config = require("../config");
const AIConversation = require("../models/aiConversation.model");
const MealLog = require("../models/mealLog.model");
const GlucoseLog = require("../models/glucoseLog.model");
const FoodItem = require("../models/food.model");
const {
  t,
  getAiLanguageInstruction,
} = require("../utils/i18n.util");

// ─── Azure OpenAI client ─────────────────────────────────────────────────────

const AZURE_ENDPOINT = config.azureOpenAI.endpoint;
const AZURE_API_KEY = config.azureOpenAI.apiKey;
const AZURE_DEPLOYMENT = config.azureOpenAI.deploymentName;
const AZURE_API_VERSION = config.azureOpenAI.apiVersion;
const AZURE_MAX_TOKENS = config.azureOpenAI.maxTokens;

// Azure OpenAI chat completions URL
// POST {endpoint}/openai/deployments/{deployment}/chat/completions?api-version={version}
const getAzureUrl = () =>
  `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;

const isAzureConfigured = () =>
  Boolean(AZURE_ENDPOINT && AZURE_API_KEY && AZURE_DEPLOYMENT && AZURE_API_VERSION);

/**
 * Send a chat completion request to Azure OpenAI.
 * Returns the assistant message content string, or null on failure.
 */
const callAzureOpenAI = async ({ messages, temperature = 0.3, max_tokens }) => {
  if (!isAzureConfigured()) {
    return null;
  }

  const response = await axios
    .post(
      getAzureUrl(),
      {
        messages,
        temperature,
        max_tokens: max_tokens || AZURE_MAX_TOKENS,
      },
      {
        headers: {
          "api-key": AZURE_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    )
    .catch((err) => {
      console.error("[Azure OpenAI] Request failed:", err?.response?.data || err.message);
      return null;
    });

  return response?.data?.choices?.[0]?.message?.content || null;
};

// ─── Text helpers ─────────────────────────────────────────────────────────────

const sanitizeExplanation = (text) =>
  String(text || "")
    .replace(/\s+/g, " ")
    .replace(/[*#`]/g, "")
    .trim();

const sanitizeChatReply = (text) =>
  String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[*`]/g, "")
    .trim();

const dedupeRepeatedSentences = (text) => {
  const normalized = sanitizeChatReply(text);
  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const dedupedBlocks = blocks.map((block) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (
      lines.length > 1 &&
      lines.every((line) => /^([-•]|\d+\.)\s+/.test(line))
    ) {
      const seenLines = new Set();
      return lines
        .filter((line) => {
          const fingerprint = line.toLowerCase();
          if (seenLines.has(fingerprint)) return false;
          seenLines.add(fingerprint);
          return true;
        })
        .join("\n");
    }

    const parts = block
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    const deduped = [];
    const seen = new Set();
    for (const part of parts) {
      const previous = deduped[deduped.length - 1];
      const fingerprint = part.toLowerCase();
      if (previous && previous.toLowerCase() === fingerprint) continue;
      if (seen.has(fingerprint)) continue;
      deduped.push(part);
      seen.add(fingerprint);
    }

    return deduped.join(" ").trim();
  });

  return dedupedBlocks.join("\n\n").trim();
};

const createTextChunks = (text, size = 48) => {
  const normalized = dedupeRepeatedSentences(text);
  const chunks = [];
  for (let index = 0; index < normalized.length; index += size) {
    chunks.push(normalized.slice(index, index + size));
  }
  return chunks.length > 0 ? chunks : [""];
};

const toConversationPreview = (text, maxLength = 240) => {
  const normalized = dedupeRepeatedSentences(text);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trim()}...`;
};

const getConversationTitle = (message) => {
  const clean = sanitizeChatReply(message).replace(/[?.!]+$/, "");
  if (!clean) return "New conversation";
  const words = clean.split(/\s+/).slice(0, 6);
  const title = words.join(" ");
  const normalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);
  return normalizedTitle.length > 56
    ? `${normalizedTitle.slice(0, 53).trim()}...`
    : normalizedTitle;
};

// ─── Fallback (no AI key) ─────────────────────────────────────────────────────

const buildFallbackExplanation = ({
  mealType,
  selectedFoods = [],
  maxCarbsAllowed,
  lastGlucose,
  alerts = [],
  tips = [],
  profile = {},
}) => {
  const foodNames = selectedFoods.slice(0, 4).map((food) => food.localName);
  const affordabilityNote =
    profile.incomeBracket === "low"
      ? "Budget-friendly options were prioritized."
      : profile.incomeBracket === "middle"
        ? "Balanced cost and nutrition were considered."
        : "Nutrition quality was prioritized, with broader food options available.";

  const glucoseNote =
    typeof lastGlucose === "number"
      ? lastGlucose > 180
        ? `Your last glucose reading was ${lastGlucose} mg/dL, so lower-GI and lower-carb foods were favored.`
        : lastGlucose < 70
          ? `Your last glucose reading was ${lastGlucose} mg/dL, so the recommendation avoids overly restrictive carbs.`
          : `Your last glucose reading was ${lastGlucose} mg/dL, which supports a balanced meal plan.`
      : "No recent glucose reading was available, so a conservative diabetes-safe plan was used.";

  const alertText =
    alerts.length > 0
      ? `Important note: ${alerts.slice(0, 2).map((a) => a.message).join(" ")}`
      : "";

  const tipText = tips.length > 0 ? `Practical tip: ${tips[0]}` : "Keep portions moderate.";

  return [
    `${mealType[0].toUpperCase()}${mealType.slice(1)} recommendation: ${
      foodNames.length > 0
        ? `consider ${foodNames.join(", ")}.`
        : "consider the highest-ranked diabetes-friendly foods available."
    }`,
    `The meal is being kept around a ${maxCarbsAllowed}g carbohydrate ceiling.`,
    glucoseNote,
    affordabilityNote,
    alertText,
    tipText,
  ]
    .filter(Boolean)
    .join(" ");
};

const CHAT_DUPLICATE_WINDOW_MS = 20 * 1000;

const buildConversationPayload = (conversation, assistantMessage) => ({
  conversation: {
    id: conversation._id.toString(),
    title: conversation.title,
    lastMessage: conversation.lastMessage,
    updatedAt: conversation.updatedAt,
    createdAt: conversation.createdAt,
  },
  message: {
    role: "assistant",
    content: assistantMessage.content,
    source: assistantMessage.source || "azure",
    safeFallbackUsed: Boolean(assistantMessage.safeFallbackUsed),
    language: "english",
    chunks: createTextChunks(assistantMessage.content),
    createdAt: assistantMessage.createdAt || new Date().toISOString(),
  },
});

const findDuplicateAssistantReply = (conversation, trimmedMessage) => {
  const messages = conversation?.messages || [];
  if (messages.length < 2) return null;

  const lastAssistant = messages[messages.length - 1];
  const lastUser = messages[messages.length - 2];

  if (
    lastUser?.role !== "user" ||
    lastAssistant?.role !== "assistant" ||
    sanitizeChatReply(lastUser.content) !== trimmedMessage
  ) {
    return null;
  }

  const lastAssistantTime = new Date(lastAssistant.createdAt || 0).getTime();
  if (!lastAssistantTime || Date.now() - lastAssistantTime > CHAT_DUPLICATE_WINDOW_MS) {
    return null;
  }

  return {
    content: sanitizeChatReply(lastAssistant.content),
    source: lastAssistant.source || "azure",
    safeFallbackUsed: Boolean(lastAssistant.safeFallbackUsed),
    createdAt:
      lastAssistant.createdAt instanceof Date
        ? lastAssistant.createdAt.toISOString()
        : new Date(lastAssistant.createdAt || Date.now()).toISOString(),
  };
};

const isLikelyIdentityQuestion = (message) =>
  /\b(my name|who am i|what is my name)\b/i.test(message);

const isLikelyOwnerQuestion = (message) =>
  /\b(who (built|created|owns) (this|the) app|who owns gluvia|who owns this app)\b/i.test(message);

const isLikelyGreeting = (message) =>
  /^(hi|hello|hey|good (morning|afternoon|evening))/i.test(message.trim());

const isLikelyOutOfScope = (message) =>
  /\b(movie|football|soccer|music|politics|crypto|lottery|dating|gossip)\b/i.test(message);

const buildFallbackChatReply = async ({ message, user, context }) => {
  const trimmed = sanitizeChatReply(message);

  if (isLikelyIdentityQuestion(trimmed)) {
    return user?.name
      ? t("chat_name_known", "english", { name: user.name })
      : t("chat_name_unknown", "english");
  }

  if (isLikelyOwnerQuestion(trimmed)) {
    return t("chat_owner", "english");
  }

  if (isLikelyGreeting(trimmed)) {
    return user?.name
      ? t("chat_greeting_known", "english", { name: user.name })
      : t("chat_greeting_unknown", "english");
  }

  if (isLikelyOutOfScope(trimmed)) {
    return t("chat_scope_limit", "english");
  }

  const latestGlucoseValue = context.latestGlucose?.valueMgDl ?? context.latestGlucose;
  const glucoseLine =
    typeof latestGlucoseValue === "number"
      ? latestGlucoseValue > 180
        ? t("chat_glucose_high", "english", { value: latestGlucoseValue })
        : latestGlucoseValue < 70
          ? t("chat_glucose_low", "english", { value: latestGlucoseValue })
          : t("chat_glucose_balanced", "english", { value: latestGlucoseValue })
      : t("chat_glucose_missing", "english");

  const trendLine =
    context.glucoseSummary?.trendLabel
      ? `Glucose trend: ${context.glucoseSummary.trendLabel}.`
      : null;

  const profileBits = [
    user?.profile?.diabetesType ? `diabetes type: ${user.profile.diabetesType}` : null,
    user?.profile?.activityLevel ? `activity level: ${user.profile.activityLevel}` : null,
    user?.profile?.incomeBracket ? `budget: ${user.profile.incomeBracket}` : null,
  ].filter(Boolean);

  const contextLine =
    profileBits.length > 0
      ? t("chat_profile_context", "english", { details: profileBits.join(", ") })
      : t("chat_profile_missing", "english");

  const recentMealLine = context.latestMealSummary || t("chat_meal_missing", "english");
  const foodsLine =
    context.commonFoods?.length > 0
      ? `Frequently logged foods: ${context.commonFoods
          .slice(0, 4)
          .map((item) => item.name)
          .join(", ")}.`
      : null;

  return [glucoseLine, trendLine, contextLine, recentMealLine, foodsLine]
    .filter(Boolean)
    .join(" ");
};

// ─── Context helpers ──────────────────────────────────────────────────────────

const getUserChatContext = async (userId) => {
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [glucoseLogs, mealLogs] = await Promise.all([
    GlucoseLog.find({ userId })
      .sort({ timestamp: -1, createdAt: -1 })
      .select("valueMgDl type timestamp createdAt symptoms notes")
      .lean(),
    MealLog.find({ userId })
      .sort({ timestamp: -1, createdAt: -1 })
      .select("mealType calculatedTotals entries timestamp createdAt")
      .populate("entries.foodId", "localName canonicalName category")
      .lean(),
  ]);

  const glucoseValues = glucoseLogs
    .map((log) => log.valueMgDl)
    .filter((value) => typeof value === "number");
  const glucose7d = glucoseLogs.filter(
    (log) => new Date(log.timestamp || log.createdAt) >= sevenDaysAgo
  );
  const glucose30d = glucoseLogs.filter(
    (log) => new Date(log.timestamp || log.createdAt) >= thirtyDaysAgo
  );
  const meal7d = mealLogs.filter(
    (log) => new Date(log.timestamp || log.createdAt) >= sevenDaysAgo
  );
  const meal30d = mealLogs.filter(
    (log) => new Date(log.timestamp || log.createdAt) >= thirtyDaysAgo
  );

  const average = (logs) =>
    logs.length
      ? Math.round(
          logs.reduce((sum, log) => sum + (log.valueMgDl || 0), 0) / logs.length
        )
      : null;

  const latestGlucose = glucoseLogs[0]
    ? {
        valueMgDl: glucoseLogs[0].valueMgDl,
        type: glucoseLogs[0].type,
        timestamp: glucoseLogs[0].timestamp || glucoseLogs[0].createdAt,
        symptoms: glucoseLogs[0].symptoms || [],
        notes: glucoseLogs[0].notes || null,
      }
    : null;

  const recentTrend = (() => {
    const recent = glucoseLogs.slice(0, 3).map((log) => log.valueMgDl);
    const previous = glucoseLogs.slice(3, 6).map((log) => log.valueMgDl);
    if (recent.length === 0 || previous.length === 0) return null;
    const recentAvg = recent.reduce((sum, value) => sum + value, 0) / recent.length;
    const previousAvg =
      previous.reduce((sum, value) => sum + value, 0) / previous.length;
    const delta = Math.round(recentAvg - previousAvg);

    if (Math.abs(delta) < 8) {
      return { delta, label: "stable compared with your previous readings" };
    }

    return delta > 0
      ? { delta, label: `rising by about ${delta} mg/dL versus your previous readings` }
      : {
          delta,
          label: `falling by about ${Math.abs(delta)} mg/dL versus your previous readings`,
        };
  })();

  const latestMeal = mealLogs[0];
  const latestMealSummary = latestMeal
    ? `Latest logged ${latestMeal.mealType}: ~${Math.round(
        latestMeal.calculatedTotals?.carbs || 0
      )}g carbs, ${Math.round(latestMeal.calculatedTotals?.calories || 0)} kcal.`
    : null;

  const mealTypeBreakdown = mealLogs.reduce((acc, meal) => {
    acc[meal.mealType] = (acc[meal.mealType] || 0) + 1;
    return acc;
  }, {});

  const foodFrequency = new Map();
  const recentFoodNames = [];
  for (const meal of mealLogs) {
    for (const entry of meal.entries || []) {
      const name =
        entry.foodId?.localName ||
        entry.foodId?.canonicalName ||
        entry.portionName ||
        "Meal item";
      foodFrequency.set(name, (foodFrequency.get(name) || 0) + 1);
      if (!recentFoodNames.includes(name)) {
        recentFoodNames.push(name);
      }
    }
  }

  const commonFoods = [...foodFrequency.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const recentMeals = mealLogs.slice(0, 5).map((meal) => ({
    mealType: meal.mealType,
    carbs: Math.round(meal.calculatedTotals?.carbs || 0),
    calories: Math.round(meal.calculatedTotals?.calories || 0),
    timestamp: meal.timestamp || meal.createdAt,
    foods: (meal.entries || [])
      .map((entry) => entry.foodId?.localName || entry.portionName || "Meal item")
      .slice(0, 5),
  }));

  return {
    latestGlucose,
    latestMealSummary,
    recentMeals,
    recentFoodsEaten: recentFoodNames.slice(0, 20),
    commonFoods,
    glucoseSummary: {
      totalReadings: glucoseLogs.length,
      totalReadings7Days: glucose7d.length,
      totalReadings30Days: glucose30d.length,
      average7Days: average(glucose7d),
      average30Days: average(glucose30d),
      averageAllTime:
        glucoseValues.length > 0
          ? Math.round(glucoseValues.reduce((sum, value) => sum + value, 0) / glucoseValues.length)
          : null,
      highReadings7Days: glucose7d.filter((log) => log.valueMgDl > 180).length,
      lowReadings7Days: glucose7d.filter((log) => log.valueMgDl < 70).length,
      inRange7Days: glucose7d.filter(
        (log) => log.valueMgDl >= 70 && log.valueMgDl <= 180
      ).length,
      fastingAverage30Days: average(
        glucose30d.filter((log) => log.type === "fasting")
      ),
      postMealAverage30Days: average(
        glucose30d.filter((log) =>
          ["after_meal", "2hr_post_meal", "postprandial"].includes(log.type)
        )
      ),
      trendLabel: recentTrend?.label || null,
    },
    mealSummary: {
      totalMealsLogged: mealLogs.length,
      totalMealsLogged7Days: meal7d.length,
      totalMealsLogged30Days: meal30d.length,
      averageCarbsPerMeal30Days: meal30d.length
        ? Math.round(
            meal30d.reduce(
              (sum, meal) => sum + (meal.calculatedTotals?.carbs || 0),
              0
            ) / meal30d.length
          )
        : null,
      averageCaloriesPerMeal30Days: meal30d.length
        ? Math.round(
            meal30d.reduce(
              (sum, meal) => sum + (meal.calculatedTotals?.calories || 0),
              0
            ) / meal30d.length
          )
        : null,
      mealTypeBreakdown,
    },
  };
};

// ─── Conversation management ──────────────────────────────────────────────────

const getChatConversationList = async (userId) => {
  const conversations = await AIConversation.find({ userId })
    .sort({ updatedAt: -1 })
    .select("_id title lastMessage updatedAt createdAt")
    .lean();

  return conversations.map((conversation) => ({
    id: conversation._id.toString(),
    title: conversation.title,
    lastMessage: conversation.lastMessage || "",
    messageCount: 0,
    updatedAt: conversation.updatedAt,
    createdAt: conversation.createdAt,
  }));
};

const getChatConversation = async (userId, conversationId) => {
  const conversation = await AIConversation.findOne({
    _id: conversationId,
    userId,
  })
    .select("title lastMessage updatedAt createdAt messages")
    .lean();

  if (!conversation) {
    const error = new Error(t("conversation_not_found", "english"));
    error.statusCode = 404;
    error.code = "CONVERSATION_NOT_FOUND";
    throw error;
  }

  return {
    id: conversation._id.toString(),
    title: conversation.title,
    lastMessage: conversation.lastMessage || "",
    updatedAt: conversation.updatedAt,
    createdAt: conversation.createdAt,
    messages: (conversation.messages || []).map((message, index) => ({
      id: `${conversation._id.toString()}_${index}_${message.createdAt?.getTime?.() || index}`,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
  };
};

const getChatConversationById = getChatConversation;

const deleteChatConversation = async (userId, conversationId) => {
  const deletedConversation = await AIConversation.findOneAndDelete({
    _id: conversationId,
    userId,
  })
    .select("_id")
    .lean();

  if (!deletedConversation) {
    const error = new Error(t("conversation_not_found", "english"));
    error.statusCode = 404;
    error.code = "CONVERSATION_NOT_FOUND";
    throw error;
  }

  return { id: conversationId };
};

const clearChatConversations = async (userId) => {
  const result = await AIConversation.deleteMany({ userId });
  return { deletedCount: result.deletedCount || 0 };
};

// ─── Meal explanation ─────────────────────────────────────────────────────────

const explainMealRecommendation = async (payload) => {
  const fallback = buildFallbackExplanation(payload);

  if (!isAzureConfigured()) {
    return { explanation: fallback, source: "fallback", safeFallbackUsed: true };
  }

  const systemPrompt = [
    "You are a diabetes nutrition explanation assistant for Gluvia AI.",
    "You must explain an already-selected recommendation.",
    "You must not change, replace, or override the recommended foods.",
    "Keep the explanation medically cautious, practical, and concise.",
    "Do not mention being an AI model.",
    "Do not answer unrelated topics.",
    "If data is limited, say the explanation is based on available profile and glucose data.",
    getAiLanguageInstruction("english"),
    "Output plain text only.",
  ].join(" ");

  const userPrompt = JSON.stringify({
    instruction:
      "Explain why this meal recommendation fits the user's profile. Mention glucose, carb target, affordability, and portion discipline when relevant. Keep it under 120 words.",
    mealType: payload.mealType,
    maxCarbsAllowed: payload.maxCarbsAllowed,
    lastGlucose: payload.lastGlucose,
    profile: {
      diabetesType: payload.profile?.diabetesType,
      bmi: payload.profile?.bmi,
      activityLevel: payload.profile?.activityLevel,
      incomeBracket: payload.profile?.incomeBracket,
      allergies: payload.profile?.allergies,
    },
    selectedFoods: (payload.selectedFoods || []).map((food) => ({
      localName: food.localName,
      category: food.category,
      gi: food.nutrients?.gi,
      carbs_g: food.suggestedPortion?.carbs_g,
      protein_g: food.nutrients?.protein_g,
      fibre_g: food.nutrients?.fibre_g,
      affordability: food.affordability,
      reasons: food.reasons,
      alerts: food.alerts,
      suggestedPortion: food.suggestedPortion,
    })),
    alerts: payload.alerts || [],
    tips: payload.tips || [],
  });

  const content = await callAzureOpenAI({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 180,
  });

  const explanation = content
    ? dedupeRepeatedSentences(sanitizeExplanation(content))
    : null;

  if (!explanation) {
    return { explanation: fallback, source: "fallback", safeFallbackUsed: true };
  }

  return { explanation, source: "azure", safeFallbackUsed: false };
};

// ─── Streaming AI chat ────────────────────────────────────────────────────────

/**
 * Like chatWithAssistant but streams tokens from Azure OpenAI in real-time.
 * Calls onConversation once the conversation is known, onToken for each
 * streamed token, and onDone with the final persisted message object.
 */
const streamChatWithAssistant = async ({
  user,
  message,
  conversationId,
  onConversation,
  onToken,
  onDone,
}) => {
  const trimmedMessage = sanitizeChatReply(message);

  if (!trimmedMessage) {
    const error = new Error(t("validation_message_required", "english"));
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const [context, existingConversation] = await Promise.all([
    getUserChatContext(user._id),
    conversationId
      ? AIConversation.findOne({ _id: conversationId, userId: user._id }).select(
          "title messages lastMessage updatedAt createdAt"
        )
      : Promise.resolve(null),
  ]);

  let conversation = existingConversation;

  if (!conversation) {
    const recentConversation = await AIConversation.findOne({ userId: user._id })
      .sort({ updatedAt: -1 })
      .select("title messages lastMessage updatedAt createdAt")
      .lean();

    const recentDuplicateReply = findDuplicateAssistantReply(recentConversation, trimmedMessage);
    if (recentConversation && recentDuplicateReply) {
      const conv = {
        id: recentConversation._id.toString(),
        title: recentConversation.title,
        lastMessage: recentConversation.lastMessage,
        updatedAt: recentConversation.updatedAt,
        createdAt: recentConversation.createdAt,
      };
      onConversation?.(conv);
      // Stream the cached reply token by token
      const words = recentDuplicateReply.content.split(" ");
      for (const word of words) {
        onToken?.(word + " ");
        await new Promise((r) => setTimeout(r, 12));
      }
      onDone?.({
        role: "assistant",
        content: recentDuplicateReply.content,
        source: recentDuplicateReply.source,
        safeFallbackUsed: recentDuplicateReply.safeFallbackUsed,
        language: "english",
        chunks: createTextChunks(recentDuplicateReply.content),
        createdAt: recentDuplicateReply.createdAt,
      });
      return;
    }

    conversation = await AIConversation.create({
      userId: user._id,
      title: getConversationTitle(trimmedMessage),
      messages: [],
    });
  }

  const inConversationDuplicateReply = findDuplicateAssistantReply(conversation, trimmedMessage);
  if (inConversationDuplicateReply) {
    const conv = {
      id: conversation._id.toString(),
      title: conversation.title,
      lastMessage: conversation.lastMessage,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt,
    };
    onConversation?.(conv);
    const words = inConversationDuplicateReply.content.split(" ");
    for (const word of words) {
      onToken?.(word + " ");
      await new Promise((r) => setTimeout(r, 12));
    }
    onDone?.({
      role: "assistant",
      content: inConversationDuplicateReply.content,
      source: inConversationDuplicateReply.source,
      safeFallbackUsed: inConversationDuplicateReply.safeFallbackUsed,
      language: "english",
      chunks: createTextChunks(inConversationDuplicateReply.content),
      createdAt: inConversationDuplicateReply.createdAt,
    });
    return;
  }

  // Emit conversation identity immediately so the client can update the URL
  onConversation?.({
    id: conversation._id.toString(),
    title: conversation.title,
    lastMessage: conversation.lastMessage || "",
    updatedAt: conversation.updatedAt,
    createdAt: conversation.createdAt,
  });

  const history = [...(conversation.messages || [])].slice(-10);
  const profileContext = {
    name: user.name,
    diabetesType: user.profile?.diabetesType,
    age: user.profile?.age,
    sex: user.profile?.sex,
    heightCm: user.profile?.heightCm,
    weightKg: user.profile?.weightKg,
    bmi: user.profile?.bmi,
    activityLevel: user.profile?.activityLevel,
    incomeBracket: user.profile?.incomeBracket,
    allergies: user.profile?.allergies || [],
  };

  let reply = "";
  let source = "fallback";
  let safeFallbackUsed = true;

  if (isAzureConfigured()) {
    const systemPrompt = [
      "You are Gluvia AI, a personal diabetes health assistant inside the Gluvia mobile app.",
      "You have full access to the user's health data: their glucose readings (7-day history, averages, highs and lows), recent meals logged, foods eaten, diabetes type, BMI, weight, height, age, sex, activity level, income bracket, and allergies.",
      "Use this data actively in every relevant answer — reference their actual numbers when answering trend or pattern questions.",
      "When the user asks about their glucose trend, compute and explain it using the provided 7-day stats.",
      "Support users with diabetes-safe food choices, meal planning, glucose-aware explanations, and Gluvia app guidance.",
      "The app owner is Gluvia Team.",
      "Answer identity questions from the provided user context when available.",
      "You may mention foods not present in the app catalog — describe them naturally without labeling them.",
      "Do not claim to diagnose or replace a doctor.",
      "For questions completely unrelated to diabetes, nutrition, glucose, or health, politely redirect.",
      getAiLanguageInstruction("english"),
      "Keep answers practical, concise, and medically cautious.",
      "Use short paragraphs. Format lists as numbered or dashed items when listing options.",
      "Do not repeat the same sentence or point.",
      "Output plain text only.",
    ].join(" ");

    try {
      const streamResponse = await axios.post(
        `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`,
        {
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "system",
              content: JSON.stringify({ user: profileContext, recentContext: context }),
            },
            ...history.map((item) => ({ role: item.role, content: item.content })),
            { role: "user", content: trimmedMessage },
          ],
          temperature: 0.3,
          max_tokens: AZURE_MAX_TOKENS,
          stream: true,
        },
        {
          headers: {
            "api-key": AZURE_API_KEY,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          responseType: "stream",
          timeout: 30000,
        }
      );

      const stream = streamResponse.data;
      let buffer = "";

      await new Promise((resolve, reject) => {
        stream.on("data", (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (!trimmed.startsWith("data: ")) continue;

            try {
              const json = JSON.parse(trimmed.slice(6));
              const token = json?.choices?.[0]?.delta?.content;
              if (token) {
                reply += token;
                onToken?.(token);
              }
            } catch {}
          }
        });

        stream.on("end", resolve);
        stream.on("error", reject);
      });

      if (reply) {
        reply = dedupeRepeatedSentences(sanitizeChatReply(reply));
        source = "azure";
        safeFallbackUsed = false;
      }
    } catch (err) {
      console.error("[Azure OpenAI stream] Error:", err?.message);
    }
  }

  // Fallback if Azure streaming produced nothing
  if (!reply) {
    reply = await buildFallbackChatReply({ message: trimmedMessage, user, context });
    source = "fallback";
    safeFallbackUsed = true;
    // Stream the fallback reply token by token so the client still animates
    const words = reply.split(" ");
    for (const word of words) {
      onToken?.(word + " ");
      await new Promise((r) => setTimeout(r, 18));
    }
  }

  // Persist
  conversation.messages.push(
    { role: "user", content: trimmedMessage, createdAt: new Date() },
    { role: "assistant", content: reply, createdAt: new Date(), source, safeFallbackUsed }
  );
  conversation.messages = conversation.messages.slice(-20);
  conversation.lastMessage = toConversationPreview(reply);
  if (!conversation.title || conversation.title === "New chat") {
    conversation.title = getConversationTitle(trimmedMessage);
  }
  await conversation.save();

  onDone?.({
    role: "assistant",
    content: reply,
    source,
    safeFallbackUsed,
    language: "english",
    chunks: createTextChunks(reply),
    createdAt: new Date().toISOString(),
  });
};

// ─── AI chat ──────────────────────────────────────────────────────────────────

const chatWithAssistant = async ({ user, message, conversationId }) => {
  const trimmedMessage = sanitizeChatReply(message);

  if (!trimmedMessage) {
    const error = new Error(t("validation_message_required", "english"));
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const [context, existingConversation] = await Promise.all([
    getUserChatContext(user._id),
    conversationId
      ? AIConversation.findOne({ _id: conversationId, userId: user._id }).select(
          "title messages lastMessage updatedAt createdAt"
        )
      : Promise.resolve(null),
  ]);

  let conversation = existingConversation;

  if (!conversation) {
    const recentConversation = await AIConversation.findOne({ userId: user._id })
      .sort({ updatedAt: -1 })
      .select("title messages lastMessage updatedAt createdAt")
      .lean();

    const recentDuplicateReply = findDuplicateAssistantReply(
      recentConversation,
      trimmedMessage
    );

    if (recentConversation && recentDuplicateReply) {
      return buildConversationPayload(recentConversation, recentDuplicateReply);
    }

    conversation = await AIConversation.create({
      userId: user._id,
      title: getConversationTitle(trimmedMessage),
      messages: [],
    });
  }

  const inConversationDuplicateReply = findDuplicateAssistantReply(
    conversation,
    trimmedMessage
  );

  if (inConversationDuplicateReply) {
    return buildConversationPayload(conversation, inConversationDuplicateReply);
  }

  const history = [...(conversation.messages || [])].slice(-10);
  const profileContext = {
    name: user.name,
    diabetesType: user.profile?.diabetesType,
    age: user.profile?.age,
    sex: user.profile?.sex,
    heightCm: user.profile?.heightCm,
    weightKg: user.profile?.weightKg,
    bmi: user.profile?.bmi,
    activityLevel: user.profile?.activityLevel,
    incomeBracket: user.profile?.incomeBracket,
    allergies: user.profile?.allergies || [],
  };

  const fallback = await buildFallbackChatReply({ message: trimmedMessage, user, context });

  let reply = fallback;
  let source = "fallback";
  let safeFallbackUsed = true;

  if (isAzureConfigured()) {
    const systemPrompt = [
      "You are Gluvia AI, a personal diabetes health assistant inside the Gluvia mobile app.",
      "You have full access to the user's health data: their glucose readings (7-day history, averages, highs and lows), recent meals logged, foods eaten, diabetes type, BMI, weight, height, age, sex, activity level, income bracket, and allergies.",
      "Use this data actively in every relevant answer — reference their actual numbers when answering trend or pattern questions.",
      "When the user asks about their glucose trend, compute and explain it using the provided 7-day stats.",
      "Support users with diabetes-safe food choices, meal planning, glucose-aware explanations, and Gluvia app guidance.",
      "The app owner is Gluvia Team.",
      "Answer identity questions from the provided user context when available.",
      "You may mention foods not present in the app catalog — describe them naturally without labeling them.",
      "Do not claim to diagnose or replace a doctor.",
      "For questions completely unrelated to diabetes, nutrition, glucose, or health, politely redirect.",
      getAiLanguageInstruction("english"),
      "Keep answers practical, concise, and medically cautious.",
      "Use short paragraphs. Format lists as numbered or dashed items when listing options.",
      "Do not repeat the same sentence or point.",
      "Output plain text only.",
    ].join(" ");

    const content = await callAzureOpenAI({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "system",
          content: JSON.stringify({ user: profileContext, recentContext: context }),
        },
        ...history.map((item) => ({ role: item.role, content: item.content })),
        { role: "user", content: trimmedMessage },
      ],
      temperature: 0.3,
      max_tokens: AZURE_MAX_TOKENS,
    });

    const sanitized = content
      ? dedupeRepeatedSentences(sanitizeChatReply(content))
      : null;

    if (sanitized) {
      reply = sanitized;
      source = "azure";
      safeFallbackUsed = false;
    }
  }

  conversation.messages.push(
    { role: "user", content: trimmedMessage, createdAt: new Date() },
    { role: "assistant", content: reply, createdAt: new Date(), source, safeFallbackUsed }
  );
  conversation.messages = conversation.messages.slice(-20);
  conversation.lastMessage = toConversationPreview(reply);
  if (!conversation.title || conversation.title === "New chat") {
    conversation.title = getConversationTitle(trimmedMessage);
  }
  await conversation.save();

  return {
    conversation: {
      id: conversation._id.toString(),
      title: conversation.title,
      lastMessage: conversation.lastMessage,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt,
    },
    message: {
      role: "assistant",
      content: reply,
      source,
      safeFallbackUsed,
      language: "english",
      chunks: createTextChunks(reply),
      createdAt: new Date().toISOString(),
    },
  };
};

// ─── AI food generation ───────────────────────────────────────────────────────

/**
 * Use Azure OpenAI to generate nutritional data for an unknown food name,
 * then persist it to the food collection so future users benefit.
 */
const generateAndSaveFood = async (foodName) => {
  if (!foodName || typeof foodName !== "string") return null;
  const name = foodName.trim();
  if (!name) return null;

  // Check if it already exists
  const existing = await FoodItem.findOne({
    $or: [
      { localName: new RegExp(`^${name}$`, "i") },
      { canonicalName: new RegExp(`^${name}$`, "i") },
    ],
    deleted: false,
  }).lean();
  if (existing) return existing;

  if (!isAzureConfigured()) return null;

  const prompt = `Generate realistic nutritional data for the food "${name}" as a JSON object with exactly these fields:
{
  "localName": "${name}",
  "canonicalName": "<English name if different>",
  "category": "<one of: grain, protein, vegetable, fruit, dairy, legume, snack, beverage, other>",
  "nutrients": {
    "calories": <number per 100g>,
    "carbs_g": <number>,
    "protein_g": <number>,
    "fat_g": <number>,
    "fibre_g": <number>,
    "gi": <glycemic index number 1-100 or null if unknown>
  },
  "portionSizes": [
    { "name": "1 serving", "grams": <number>, "carbs_g": <carbs per portion in grams> }
  ],
  "affordability": "<low|medium|high>",
  "tags": ["<relevant tag>"]
}
Output ONLY valid JSON. No markdown, no explanation.`;

  const content = await callAzureOpenAI({
    messages: [
      { role: "system", content: "You are a nutrition database assistant. Output only valid JSON." },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 400,
  });

  if (!content) return null;

  let data;
  try {
    const cleaned = content.replace(/```json|```/g, "").trim();
    data = JSON.parse(cleaned);
  } catch {
    return null;
  }

  // Validate required fields
  if (!data.localName || !data.nutrients?.calories) return null;

  try {
    const food = await FoodItem.create({
      localName: data.localName,
      canonicalName: data.canonicalName || data.localName,
      category: data.category || "other",
      nutrients: {
        calories: Number(data.nutrients.calories) || 0,
        carbs_g: Number(data.nutrients.carbs_g) || 0,
        protein_g: Number(data.nutrients.protein_g) || 0,
        fat_g: Number(data.nutrients.fat_g) || 0,
        fibre_g: Number(data.nutrients.fibre_g) || 0,
        gi: data.nutrients.gi != null ? Number(data.nutrients.gi) : null,
      },
      portionSizes: (data.portionSizes || [{ name: "1 serving", grams: 100 }]).map((p) => ({
        name: p.name || "1 serving",
        grams: Number(p.grams) || 100,
        ...(p.carbs_g != null && { carbs_g: Number(p.carbs_g) }),
      })),
      affordability: data.affordability || "medium",
      tags: data.tags || [],
      source: "estimated",
      version: 1,
    });
    return food.toObject({ getters: true });
  } catch {
    return null;
  }
};

module.exports = {
  explainMealRecommendation,
  buildFallbackExplanation,
  chatWithAssistant,
  streamChatWithAssistant,
  getChatConversationList,
  getChatConversation,
  getChatConversationById,
  deleteChatConversation,
  clearChatConversations,
  createTextChunks,
  generateAndSaveFood,
};
