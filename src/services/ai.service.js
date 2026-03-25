const axios = require("axios");
const config = require("../config");
const AIConversation = require("../models/aiConversation.model");
const MealLog = require("../models/mealLog.model");
const GlucoseLog = require("../models/glucoseLog.model");
const {
  t,
  getAiLanguageInstruction,
} = require("../utils/i18n.util");

const GROQ_CHAT_URL =
  config.groq.baseUrl || "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = config.groq.model || "llama-3.1-8b-instant";

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
      ? `Important note: ${alerts
          .slice(0, 2)
          .map((alert) => alert.message)
          .join(" ")}`
      : "";

  const tipText =
    tips.length > 0 ? `Practical tip: ${tips[0]}` : "Keep portions moderate.";

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
          if (seenLines.has(fingerprint)) {
            return false;
          }
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
      if (previous && previous.toLowerCase() === fingerprint) {
        continue;
      }
      if (seen.has(fingerprint)) {
        continue;
      }
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
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trim()}...`;
};

const getConversationTitle = (message) => {
  const clean = sanitizeChatReply(message).replace(/[?.!]+$/, "");
  if (!clean) {
    return "New conversation";
  }

  const words = clean.split(/\s+/).slice(0, 6);
  const title = words.join(" ");
  const normalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);
  return normalizedTitle.length > 56
    ? `${normalizedTitle.slice(0, 53).trim()}...`
    : normalizedTitle;
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
    source: assistantMessage.source || "groq",
    safeFallbackUsed: Boolean(assistantMessage.safeFallbackUsed),
    language: "english",
    chunks: createTextChunks(assistantMessage.content),
    createdAt: assistantMessage.createdAt || new Date().toISOString(),
  },
});

const findDuplicateAssistantReply = (conversation, trimmedMessage) => {
  const messages = conversation?.messages || [];
  if (messages.length < 2) {
    return null;
  }

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
    source: lastAssistant.source || "groq",
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
  /\b(who (built|created|owns) (this|the) app|who owns gluvia|who owns this app)\b/i.test(
    message
  );

const isLikelyGreeting = (message) =>
  /^(hi|hello|hey|good (morning|afternoon|evening))/i.test(message.trim());

const isLikelyOutOfScope = (message) =>
  /\b(movie|football|soccer|music|politics|crypto|lottery|dating|gossip)\b/i.test(
    message
  );

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

  const glucoseLine =
    typeof context.latestGlucose === "number"
      ? context.latestGlucose > 180
        ? t("chat_glucose_high", "english", {
            value: context.latestGlucose,
          })
        : context.latestGlucose < 70
          ? t("chat_glucose_low", "english", {
              value: context.latestGlucose,
            })
          : t("chat_glucose_balanced", "english", {
              value: context.latestGlucose,
            })
      : t("chat_glucose_missing", "english");

  const profileBits = [
    user?.profile?.diabetesType
      ? `diabetes type: ${user.profile.diabetesType}`
      : null,
    user?.profile?.activityLevel
      ? `activity level: ${user.profile.activityLevel}`
      : null,
    user?.profile?.incomeBracket
      ? `budget: ${user.profile.incomeBracket}`
      : null,
  ].filter(Boolean);

  const contextLine =
    profileBits.length > 0
      ? t("chat_profile_context", "english", {
          details: profileBits.join(", "),
        })
      : t("chat_profile_missing", "english");

  const recentMealLine = context.latestMealSummary || t("chat_meal_missing", "english");

  return [glucoseLine, contextLine, recentMealLine]
    .filter(Boolean)
    .join(" ");
};

const getUserChatContext = async (userId) => {
  const [latestGlucose, latestMeal] = await Promise.all([
    GlucoseLog.findOne({ userId })
      .sort({ createdAt: -1 })
      .select("valueMgDl createdAt")
      .lean(),
    MealLog.findOne({ userId })
      .sort({ createdAt: -1 })
      .select("mealType calculatedTotals.carbs calculatedTotals.calories createdAt")
      .lean(),
  ]);

  const latestMealSummary = latestMeal
    ? `Your latest logged ${latestMeal.mealType} had about ${Math.round(
        latestMeal.calculatedTotals?.carbs || 0
      )}g carbs and ${Math.round(
        latestMeal.calculatedTotals?.calories || 0
      )} kcal.`
    : null;

  return {
    latestGlucose: latestGlucose?.valueMgDl,
    latestMealSummary,
  };
};

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

const explainMealRecommendation = async (payload) => {
  const fallback = buildFallbackExplanation(payload);
  if (!config.groq.apiKey) {
    return {
      explanation: fallback,
      source: "fallback",
      safeFallbackUsed: true,
    };
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

  try {
    const response = await axios.post(
      GROQ_CHAT_URL,
      {
        model: GROQ_MODEL,
        temperature: 0.2,
        max_tokens: 180,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${config.groq.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 12000,
      }
    );

    const content =
      response.data?.choices?.[0]?.message?.content ||
      response.data?.choices?.[0]?.text;
    const explanation = dedupeRepeatedSentences(sanitizeExplanation(content));

    if (!explanation) {
      throw new Error("Empty AI explanation");
    }

    return {
      explanation,
      source: "groq",
      safeFallbackUsed: false,
    };
  } catch (error) {
    return {
      explanation: fallback,
      source: "fallback",
      safeFallbackUsed: true,
      providerError: error.message,
    };
  }
};

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
    activityLevel: user.profile?.activityLevel,
    incomeBracket: user.profile?.incomeBracket,
    allergies: user.profile?.allergies || [],
  };

  const fallback = await buildFallbackChatReply({
    message: trimmedMessage,
    user,
    context,
  });

  let reply = fallback;
  let source = "fallback";
  let safeFallbackUsed = true;

  if (config.groq.apiKey) {
    const systemPrompt = [
      "You are Gluvia AI, a diabetes-focused health nutrition assistant inside the Gluvia app.",
      "You support users with diabetes-safe food choices, meal planning, glucose-aware explanations, profile questions, and Gluvia app guidance.",
      "The app owner is Gluvia Team.",
      "Answer identity questions from the provided user context when available.",
      "You may mention foods not present in the app, but clearly label them as non-catalog suggestions.",
      "Do not claim to diagnose or replace a doctor.",
      "Do not override rule-engine outputs when recommendation decisions are already made elsewhere.",
      "For unrelated general questions, politely explain that you are focused on diabetes, nutrition, glucose, and the Gluvia experience.",
      getAiLanguageInstruction("english"),
      "Keep answers practical, concise, and medically cautious.",
      "Use short paragraphs.",
      "When useful, format options or steps as simple numbered or dashed lists.",
      "Do not repeat the same sentence or point.",
      "Output plain text only.",
    ].join(" ");

    const response = await axios
      .post(
        GROQ_CHAT_URL,
        {
          model: GROQ_MODEL,
          temperature: 0.3,
          max_tokens: 280,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "system",
              content: JSON.stringify({
                user: profileContext,
                recentContext: context,
              }),
            },
            ...history.map((item) => ({
              role: item.role,
              content: item.content,
            })),
            {
              role: "user",
              content: trimmedMessage,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${config.groq.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 12000,
        }
      )
      .catch(() => null);

    const content =
      response?.data?.choices?.[0]?.message?.content ||
      response?.data?.choices?.[0]?.text;
    const sanitized = dedupeRepeatedSentences(sanitizeChatReply(content));

    if (sanitized) {
      reply = sanitized;
      source = "groq";
      safeFallbackUsed = false;
    }
  }

  conversation.messages.push(
    { role: "user", content: trimmedMessage, createdAt: new Date() },
    {
      role: "assistant",
      content: reply,
      createdAt: new Date(),
      source,
      safeFallbackUsed,
    }
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

module.exports = {
  explainMealRecommendation,
  buildFallbackExplanation,
  chatWithAssistant,
  getChatConversationList,
  getChatConversation,
  deleteChatConversation,
  clearChatConversations,
  createTextChunks,
};
