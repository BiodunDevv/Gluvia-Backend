process.env.JWT_SECRET = "test-secret";

const config = require("../src/config");
const {
  explainMealRecommendation,
  buildFallbackExplanation,
  createTextChunks,
} = require("../src/services/ai.service");
const { normalizeLanguage, t } = require("../src/utils/i18n.util");

describe("ai.service", () => {
  const originalGroqKey = config.groq.apiKey;

  afterEach(() => {
    config.groq.apiKey = originalGroqKey;
  });

  it("builds a deterministic fallback explanation", () => {
    const explanation = buildFallbackExplanation({
      mealType: "lunch",
      selectedFoods: [{ localName: "Brown Rice" }, { localName: "Moi Moi" }],
      maxCarbsAllowed: 45,
      lastGlucose: 160,
      alerts: [],
      tips: ["Pair carbs with protein."],
      profile: { incomeBracket: "low" },
    });

    expect(explanation).toContain("Brown Rice");
    expect(explanation).toContain("45g");
    expect(explanation).toContain("160 mg/dL");
  });

  it("uses fallback when GROQ_API_KEY is unavailable", async () => {
    config.groq.apiKey = "";

    const result = await explainMealRecommendation({
      mealType: "dinner",
      selectedFoods: [{ localName: "Okra Soup" }],
      maxCarbsAllowed: 35,
      alerts: [],
      tips: [],
      profile: { incomeBracket: "middle" },
    });

    expect(result.source).toBe("fallback");
    expect(result.safeFallbackUsed).toBe(true);
    expect(result.explanation).toContain("35g");
  });

  it("normalizes supported languages and falls back to english", () => {
    expect(normalizeLanguage("Yoruba")).toBe("yoruba");
    expect(normalizeLanguage("unknown-language")).toBe("english");
  });

  it("returns translated backend messages", async () => {
    await expect(t("chat_owner", "hausa")).resolves.toContain("Gluvia");
    await expect(t("validation_message_required", "igbo")).resolves.not.toBe(
      "validation_message_required"
    );
  });

  it("creates stable chat chunks for streamed responses", () => {
    const chunks = createTextChunks("This is a streamed chat reply.", 8);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("")).toBe("This is a streamed chat reply.");
  });
});
