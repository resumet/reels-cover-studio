import { describe, expect, it } from "vitest";
import { countEojeol, normalizeTitleLine, validTitle } from "../lib/title-validation";

describe("title validation", () => {
  it("normalizes whitespace", () => {
    expect(normalizeTitleLine("  알고   보면  쉬운 ")).toBe("알고 보면 쉬운");
  });

  it("counts Korean eojeol by whitespace", () => {
    expect(countEojeol("알고 보면 쉬운")).toBe(3);
  });

  it("requires three lines with three eojeol each", () => {
    expect(validTitle(["이건 정말 놀랍다", "알고 보면 쉬운", "오늘 바로 확인"])).toBe(true);
    expect(validTitle(["이건 정말 놀랍다", "두 단어", "오늘 바로 확인"])).toBe(false);
  });
});
