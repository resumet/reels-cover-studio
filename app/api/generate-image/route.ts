import { NextResponse } from "next/server";
import { z } from "zod";

import type { AiDebugAttempt, AiDebugTrace } from "@/lib/ai-debug";
import {
  generateImage as generateProviderImage,
  generateStructured,
} from "@/lib/ai-generation";
import { parseAiProvider } from "@/lib/ai-provider";
import {
  backgroundConceptSystemPrompt,
  backgroundConceptUserPrompt,
  imageEditPrompt,
} from "@/lib/prompts";
import {
  guardRequest,
  publicApiError,
  validateImageFile,
} from "@/lib/request-guards";

export const runtime = "nodejs";
export const maxDuration = 300;

const backgroundConceptPromptSchema = z.object({
  visualPrompt: z.string().min(80).max(4_000),
});

export async function POST(request: Request) {
  const guarded = guardRequest(request);
  if (guarded) return guarded;

  try {
    const form = await request.formData();
    const image = validateImageFile(form.get("image1"));
    const visualPrompt = String(form.get("visualPrompt") || "").slice(0, 8_000);
    const selectedTitle = String(form.get("selectedTitle") || "").slice(0, 1_000).trim();
    const regenerate = form.get("regenerate") === "true";
    const provider = parseAiProvider(form.get("imageProvider"));
    if (!visualPrompt || !selectedTitle) {
      return NextResponse.json(
        { error: "먼저 이미지 장면을 분석하고 제목을 선택해 주세요." },
        { status: 400 },
      );
    }

    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const debugAttempts: AiDebugAttempt[] = [];
    const variationId = crypto.randomUUID();
    const userPrompt = backgroundConceptUserPrompt({
      selectedTitle,
      previousVisualPrompt: visualPrompt,
      variationId,
      regenerate,
    });
    const promptGeneration = await generateStructured({
      provider,
      systemPrompt: backgroundConceptSystemPrompt,
      userPrompt,
      schema: backgroundConceptPromptSchema,
      schemaName: "title_aware_background_prompt",
      images: [
        {
          dataUrl: `data:${image.type};base64,${imageBuffer.toString("base64")}`,
          mimeType: image.type,
        },
      ],
    });
    const effectiveVisualPrompt = promptGeneration.parsed.visualPrompt.trim();
    debugAttempts.push({
      attempt: 1,
      userPrompt,
      response: promptGeneration.raw,
      accepted: true,
      responseId: promptGeneration.responseId,
      usage: promptGeneration.usage,
    });

    const prompt = imageEditPrompt(effectiveVisualPrompt, selectedTitle, regenerate);
    const imageGeneration = await generateProviderImage({
      provider,
      prompt,
      image: {
        buffer: imageBuffer,
        name: image.name || "reference-image",
        mimeType: image.type,
      },
    });
    debugAttempts.push({
      attempt: debugAttempts.length + 1,
      userPrompt: prompt,
      response: imageGeneration.response,
      accepted: true,
      usage: imageGeneration.usage,
    });
    const debug: AiDebugTrace = {
      operation: regenerate ? "선택 제목 기반 새 콘셉트 배경 재생성" : "선택 제목 기반 배경 이미지 생성",
      api: `${promptGeneration.api} → ${imageGeneration.api}`,
      model: `${promptGeneration.model} → ${imageGeneration.model}`,
      createdAt: new Date().toISOString(),
      systemPrompt: backgroundConceptSystemPrompt,
      attachments: [
        {
          label: "참조 이미지",
          name: image.name || "reference-image",
          type: image.type,
          size: image.size,
        },
      ],
      settings: {
        regenerate,
        provider,
        selectedTitle,
        size: imageGeneration.outputSize,
        outputFormat: imageGeneration.mimeType,
      },
      attempts: debugAttempts,
    };

    return NextResponse.json({
      imageDataUrl: `data:${imageGeneration.mimeType};base64,${imageGeneration.base64}`,
      outputSize: imageGeneration.outputSize,
      visualPrompt: effectiveVisualPrompt,
      debug,
    });
  } catch (error) {
    const { message, status } = publicApiError(error);
    console.error("generate_image_failed", {
      type: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: message }, { status });
  }
}
