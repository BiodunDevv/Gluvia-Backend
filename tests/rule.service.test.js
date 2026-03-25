process.env.JWT_SECRET = "test-secret";

const { validateRuleDefinition } = require("../src/services/rule.service");

describe("validateRuleDefinition", () => {
  it("accepts finite nested numeric values", () => {
    expect(() =>
      validateRuleDefinition({
        threshold: 140,
        scoring: {
          bonus: 2,
        },
      })
    ).not.toThrow();
  });

  it("rejects non-object definitions", () => {
    expect(() => validateRuleDefinition(null)).toThrow(
      "Rule definition must be a JSON object"
    );
    expect(() => validateRuleDefinition([])).toThrow(
      "Rule definition must be a JSON object"
    );
  });

  it("rejects invalid numeric values", () => {
    expect(() =>
      validateRuleDefinition({
        scoring: {
          multiplier: Infinity,
        },
      })
    ).toThrow("Rule definition contains an invalid numeric value");
  });
});
