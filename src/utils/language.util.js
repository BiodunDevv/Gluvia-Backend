const SUPPORTED_LANGUAGES = ["english", "hausa", "yoruba", "igbo"];

const FALLBACK_LANGUAGE = "english";

const LANGUAGE_LABELS = {
  english: "English",
  hausa: "Hausa",
  yoruba: "Yoruba",
  igbo: "Igbo",
};

const normalizeLanguage = (language) => {
  const normalized = String(language || FALLBACK_LANGUAGE)
    .trim()
    .toLowerCase();

  if (SUPPORTED_LANGUAGES.includes(normalized)) {
    return normalized;
  }

  if (normalized.startsWith("hausa")) return "hausa";
  if (normalized.startsWith("yoruba")) return "yoruba";
  if (normalized.startsWith("igbo")) return "igbo";
  if (normalized.startsWith("en")) return "english";
  if (normalized.startsWith("ha")) return "hausa";
  if (normalized.startsWith("yo")) return "yoruba";
  if (normalized.startsWith("ig")) return "igbo";

  return FALLBACK_LANGUAGE;
};

const getRequestLanguage = (req) =>
  req?.user?.role === "admin"
    ? "english"
    : normalizeLanguage(
        req?.user?.profile?.language ||
          req?.body?.profile?.language ||
          req?.body?.language ||
          req?.query?.language
      );

const getAiLanguageInstruction = (language) => {
  return "Respond in clear English.";
};

module.exports = {
  SUPPORTED_LANGUAGES,
  FALLBACK_LANGUAGE,
  LANGUAGE_LABELS,
  normalizeLanguage,
  getRequestLanguage,
  getAiLanguageInstruction,
};
