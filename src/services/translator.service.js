const axios = require("axios");
const config = require("../config");
const { normalizeLanguage } = require("../utils/language.util");

const LANGUAGE_CODE_MAP = {
  english: "en",
  hausa: "ha",
  yoruba: "yo",
  igbo: "ig",
};

const translationCache = new Map();

const getTranslatorConfig = () => {
  const apiKey = config.azureTranslator?.apiKey?.trim();
  const endpoint = config.azureTranslator?.endpoint?.trim();
  const region = config.azureTranslator?.region?.trim();

  if (!apiKey || !endpoint || !region) {
    return null;
  }

  return {
    apiKey,
    endpoint: endpoint.replace(/\/$/, ""),
    region,
  };
};

const canTranslate = (language) => {
  const normalizedLanguage = normalizeLanguage(language);
  return normalizedLanguage !== "english" && Boolean(getTranslatorConfig());
};

const translateText = async (text, language) => {
  const normalizedLanguage = normalizeLanguage(language);
  const normalizedText = String(text || "").trim();

  if (!normalizedText || normalizedLanguage === "english") {
    return text;
  }

  const translatorConfig = getTranslatorConfig();
  if (!translatorConfig) {
    return text;
  }

  const cacheKey = `${normalizedLanguage}:${normalizedText}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
    const response = await axios.post(
      `${translatorConfig.endpoint}/translate`,
      [{ text: normalizedText }],
      {
        params: {
          "api-version": "3.0",
          to: LANGUAGE_CODE_MAP[normalizedLanguage] || "en",
        },
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": translatorConfig.apiKey,
          "Ocp-Apim-Subscription-Region": translatorConfig.region,
        },
        timeout: 5000,
      }
    );

    const translated =
      response.data?.[0]?.translations?.[0]?.text?.trim() || normalizedText;
    translationCache.set(cacheKey, translated);
    return translated;
  } catch (_error) {
    return text;
  }
};

module.exports = {
  canTranslate,
  translateText,
};
