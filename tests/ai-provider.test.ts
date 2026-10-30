import { describe, expect, it } from "vitest";

import { aiProviderLabel, parseAiProvider } from "../lib/ai-provider";

describe("AI provider selection", () => {
  it("uses OpenAI by default and accepts Gemini explicitly", () => {
    expect(parseAiProvider(undefined)).toBe("openai");
    expect(parseAiProvider("unknown")).toBe("openai");
    expect(parseAiProvider("gemini")).toBe("gemini");
  });

  it("returns user-facing provider labels", () => {
    expect(aiProviderLabel("openai")).toBe("OpenAI");
    expect(aiProviderLabel("gemini")).toBe("Gemini");
  });
});
