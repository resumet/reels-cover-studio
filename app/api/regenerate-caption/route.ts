import { z } from "zod";
import { NextResponse } from "next/server";

import type { AiDebugTrace } from "@/lib/ai-debug";
import { generateStructured } from "@/lib/ai-generation";
import { parseAiProvider } from "@/lib/ai-provider";
import { captionSystemPrompt } from "@/lib/prompts";
import { captionResponseSchema } from "@/lib/schemas";
import { guardRequest, publicApiError } from "@/lib/request-guards";

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
    const userPrompt = `장면 요약: ${body.sceneSummary}\n원문 캡션: ${body.sourceCaption}`;
    const generation = await generateStructured({
      provider,
      systemPrompt: captionSystemPrompt,
      userPrompt,
      schema: captionResponseSchema,
      schemaName: "reel_caption",
    });

    const result = generation.parsed;
    const debug: AiDebugTrace = {
      operation: "캡션 다시 생성",
      api: generation.api,
      model: generation.model,
      createdAt: new Date().toISOString(),
      systemPrompt: captionSystemPrompt,
      settings: { responseFormat: "reel_caption" },
      attempts: [
        {
          attempt: 1,
          userPrompt,
          response: result,
          accepted: true,
          responseId: generation.responseId,
          usage: generation.usage,
        },
      ],
    };
    return NextResponse.json({ ...result, debug });
  } catch (error) {
    const { message, status } = publicApiError(error);
    console.error("regenerate_caption_failed", {
      type: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: message }, { status });
  }
}
