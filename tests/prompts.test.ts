import { describe, expect, it } from "vitest";

import {
  analysisSystemPrompt,
  backgroundConceptSystemPrompt,
  backgroundConceptUserPrompt,
  imageEditPrompt,
  titleSystemPrompt,
} from "../lib/prompts";

describe("OpenAI prompts", () => {
  it("adds the requested community style to both title generation paths", () => {
    const instruction = "일베, 디시인사이드 스타일로 만들어.";

    expect(analysisSystemPrompt).toContain(instruction);
    expect(titleSystemPrompt).toContain(instruction);
  });

  it("requests a genuinely different background concept on regeneration", () => {
    const previousPrompt = "Previous centered daylight composition";
    const selectedTitle = "충격적인 반전이\n바로 여기서\n전부 드러났다";
    const userPrompt = backgroundConceptUserPrompt({
      selectedTitle,
      previousVisualPrompt: previousPrompt,
      variationId: "variation-123",
      regenerate: true,
    });
    const editPrompt = imageEditPrompt("A new low-angle night composition", selectedTitle, true);

    expect(backgroundConceptSystemPrompt).toContain("selected Korean title first");
    expect(backgroundConceptSystemPrompt).toContain("not as a composition to copy");
    expect(userPrompt).toContain(selectedTitle);
    expect(userPrompt).toContain(previousPrompt);
    expect(userPrompt).toContain("avoid copying or paraphrasing");
    expect(editPrompt).toContain(selectedTitle);
    expect(editPrompt).toContain("strongest focal point");
    expect(editPrompt).toContain("does not need to retain the original layout");
  });
});
