import { NextResponse } from "next/server";

import type { AiDebugAttempt, AiDebugTrace } from "@/lib/ai-debug";
import { generateStructured } from "@/lib/ai-generation";
import { parseAiProvider } from "@/lib/ai-provider";
import { analysisSystemPrompt } from "@/lib/prompts";
import {
  analysisSchema,
  type AnalysisResult,
} from "@/lib/schemas";
import {
  guardRequest,
  publicApiError,
  validateImageFile,
} from "@/lib/request-guards";
import {
  normalizeTitles,
  validTitleSet,
} from "@/lib/title-validation";

export const runtime = "nodejs";
export const maxDuration = 60;

async function toDataUrl(file: File): Promise<string> {
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  return `data:${file.type};base64,${base64}`;
}

export async function POST(request: Request) {
  const guarded = guardRequest(request);
  if (guarded) return guarded;

  try {
    const form = await request.formData();
    const image1 = validateImageFile(form.get("image1"));
    const image2 = validateImageFile(form.get("image2"));
    const provider = parseAiProvider(form.get("textProvider"));
    const tone = String(form.get("tone") || "대중적이고 자연스러운 한국어").slice(0, 120);
    const captionOverride = String(form.get("captionOverride") || "").slice(0, 8_000);
    const [image1Url, image2Url] = await Promise.all([
      toDataUrl(image1),
      toDataUrl(image2),
    ]);

    let result: AnalysisResult | null = null;
    let api = "";
    let model = "";
    const debugAttempts: AiDebugAttempt[] = [];

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const correction = attempt
        ? `이전 출력이 제목 규칙을 위반했다. 이번에는 모든 줄을 반드시 공백 기준 정확히 3어절로 작성하라. 재시도 ${attempt}.`
        : "두 이미지를 분석하고 구조화된 결과를 작성하라.";
      const userPrompt = `${correction}\n원하는 말투: ${tone}${
        captionOverride
          ? `\n사용자가 교정한 캡션 원문: ${captionOverride}`
          : ""
      }`;

      const generation = await generateStructured({
        provider,
        systemPrompt: analysisSystemPrompt,
        userPrompt,
        schema: analysisSchema,
        schemaName: "reel_content_analysis",
        images: [
          { dataUrl: image1Url, mimeType: image1.type },
          { dataUrl: image2Url, mimeType: image2.type },
        ],
      });
      api = generation.api;
      model = generation.model;

      let accepted = false;
      const normalized = {
        ...generation.parsed,
        titles: normalizeTitles(generation.parsed.titles),
      };
      if (validTitleSet(normalized.titles)) {
        result = normalized;
        accepted = true;
      }

      debugAttempts.push({
        attempt: attempt + 1,
        userPrompt,
        response: generation.raw,
        accepted,
        responseId: generation.responseId,
        usage: generation.usage,
      });
      if (accepted) break;
    }

    if (!result) throw new Error("INVALID_MODEL_OUTPUT");
    const debug: AiDebugTrace = {
      operation: "이미지 분석 및 제목·캡션 생성",
      api,
      model,
      createdAt: new Date().toISOString(),
      systemPrompt: analysisSystemPrompt,
      attachments: [
        {
          label: "이미지 1 · 표지 소재",
          name: image1.name || "image1",
          type: image1.type,
          size: image1.size,
          detail: "high",
        },
        {
          label: "이미지 2 · 캡션",
          name: image2.name || "image2",
          type: image2.type,
          size: image2.size,
          detail: "high",
        },
      ],
      settings: { responseFormat: "reel_content_analysis" },
      attempts: debugAttempts,
    };
    return NextResponse.json({ ...result, debug });
  } catch (error) {
    const { message, status } = publicApiError(error);
    console.error("analyze_request_failed", {
      type: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: message }, { status });
  }
}
