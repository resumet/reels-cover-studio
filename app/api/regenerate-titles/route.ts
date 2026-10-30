import { z } from "zod";
import { NextResponse } from "next/server";

import type { AiDebugAttempt, AiDebugTrace } from "@/lib/ai-debug";
import { generateStructured } from "@/lib/ai-generation";
import { parseAiProvider } from "@/lib/ai-provider";
import { titleSystemPrompt } from "@/lib/prompts";
import { titlesResponseSchema } from "@/lib/schemas";
import { guardRequest, publicApiError } from "@/lib/request-guards";
import { normalizeTitles, validTitleSet } from "@/lib/title-validation";

export const runtime = "nodejs";
export const maxDuration = 30;

const requestSchema = z.object({
  sceneSummary: z.string().max(4_000),
  sourceCaption: z.string().max(8_000),
  textProvider: z.enum(["openai", "gemini"]).optional(),
});

export async function POST(request: Request) {
  const guarded = guardRequest(request);
  if (guarded) return guarded;

  try {
    const body = requestSchema.parse(await request.json());
    const provider = parseAiProvider(body.textProvider);
    const debugAttempts: AiDebugAttempt[] = [];

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const userPrompt = `장면: ${body.sceneSummary}\n원문 캡션: ${body.sourceCaption}\n${
        attempt
          ? "모든 줄이 반드시 정확히 3어절인지 다시 세어서 출력하라."
          : "서로 다른 제목 5개를 생성하라."
      }`;
      const generation = await generateStructured({
        provider,
        systemPrompt: titleSystemPrompt,
        userPrompt,
        schema: titlesResponseSchema,
        schemaName: "reel_titles",
      });

      const titles: z.infer<typeof titlesResponseSchema>["titles"] = normalizeTitles(generation.parsed.titles);
      const accepted = validTitleSet(titles);

      debugAttempts.push({
        attempt: attempt + 1,
        userPrompt,
        response: generation.raw,
        accepted,
        responseId: generation.responseId,
        usage: generation.usage,
      });

      if (accepted && titles) {
        const debug: AiDebugTrace = {
          operation: "제목 5개 다시 생성",
          api: generation.api,
          model: generation.model,
          createdAt: new Date().toISOString(),
          systemPrompt: titleSystemPrompt,
          settings: { responseFormat: "reel_titles" },
          attempts: debugAttempts,
        };
        return NextResponse.json({ titles, debug });
      }
    }

    throw new Error("INVALID_MODEL_OUTPUT");
  } catch (error) {
    const { message, status } = publicApiError(error);
    console.error("regenerate_titles_failed", {
      type: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: message }, { status });
  }
}
