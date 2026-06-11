import { describe, expect, it } from "vitest";
import { sumGeminiUsage } from "./gemini-provider.js";

// Captured from a real `gemini -p --output-format json --skip-trust` run:
// gemini routes through a router model and a main model per call.
const sampleStats = {
  models: {
    "gemini-3.1-flash-lite": {
      tokens: { input: 946, candidates: 29, total: 1209, cached: 0, thoughts: 234 },
    },
    "gemini-3-flash-preview": {
      tokens: { input: 1878, candidates: 9, total: 2011, cached: 0, thoughts: 124 },
    },
  },
};

describe("sumGeminiUsage", () => {
  it("sums input/output/cached tokens across every model in .stats.models", () => {
    expect(sumGeminiUsage(sampleStats)).toEqual({
      inputTokens: 946 + 1878,
      outputTokens: 29 + 234 + 9 + 124,
      cacheReadInputTokens: undefined,
    });
  });

  it("returns zeroed usage when stats are missing", () => {
    expect(sumGeminiUsage(undefined)).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: undefined,
    });
  });

  it("includes cacheReadInputTokens when the model reports cached tokens", () => {
    const stats = { models: { "gemini-3-flash-preview": { tokens: { input: 100, candidates: 10, cached: 40 } } } };
    expect(sumGeminiUsage(stats)).toEqual({
      inputTokens: 100,
      outputTokens: 10,
      cacheReadInputTokens: 40,
    });
  });
});
