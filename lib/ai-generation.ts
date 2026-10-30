import { toFile } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z, type ZodType } from "zod";

import type { AiProvider } from "@/lib/ai-provider";
import { getGemini, getGeminiImageModel, getGeminiTextModel } from "@/lib/gemini";
import { getImageModel, getOpenAI, getTextModel } from "@/lib/openai";

export type AiImageInput = {
  dataUrl: string;
  mimeType: string;
};

type StructuredGenerationOptions<T> = {
  provider: AiProvider;
  systemPrompt: string;
  userPrompt: string;
  schema: ZodType<T>;
  schemaName: string;
  images?: AiImageInput[];
};

export type StructuredGenerationResult<T> = {
  parsed: T;
  raw: unknown;
  responseId?: string;
  usage?: unknown;
  api: string;
  model: string;
};

function base64FromDataUrl(dataUrl: string): string {
  const separator = dataUrl.indexOf(",");
  return separator >= 0 ? dataUrl.slice(separator + 1) : dataUrl;
}

function jsonSchemaFor<T>(schema: ZodType<T>): Record<string, unknown> {
  const jsonSchema = { ...(z.toJSONSchema(schema) as Record<string, unknown>) };
  delete jsonSchema.$schema;
  return jsonSchema;
}

export async function generateStructured<T>({
  provider,
  systemPrompt,
  userPrompt,
  schema,
  schemaName,
  images = [],
}: StructuredGenerationOptions<T>): Promise<StructuredGenerationResult<T>> {
  if (provider === "gemini") {
    const model = getGeminiTextModel();
    const response = await getGemini().interactions.create({
      model,
      system_instruction: systemPrompt,
      input: [
        { type: "text", text: userPrompt },
        ...images.map((image) => ({
          type: "image" as const,
          data: base64FromDataUrl(image.dataUrl),
          mime_type: image.mimeType,
        })),
      ],
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: jsonSchemaFor(schema),
      },
      store: false,
    });
    if (!response.output_text) throw new Error("INVALID_MODEL_OUTPUT");
    const raw: unknown = JSON.parse(response.output_text);
    return {
      parsed: schema.parse(raw),
      raw,
      responseId: response.id,
      usage: response.usage,
      api: "Gemini Interactions API",
      model,
    };
  }

  const model = getTextModel();
  const response = await getOpenAI().responses.parse({
    model,
    input: [
      { role: "system", content: systemPrompt },
      images.length
        ? {
            role: "user",
            content: [
              { type: "input_text", text: userPrompt },
              ...images.map((image) => ({
                type: "input_image" as const,
                image_url: image.dataUrl,
                detail: "high" as const,
              })),
            ],
          }
        : { role: "user", content: userPrompt },
    ],
    text: {
      format: zodTextFormat(schema, schemaName),
    },
  });
  if (!response.output_parsed) throw new Error("INVALID_MODEL_OUTPUT");
  return {
    parsed: schema.parse(response.output_parsed),
    raw: response.output_parsed,
    responseId: response.id,
    usage: response.usage,
    api: "OpenAI Responses API",
    model,
  };
}

type ImageGenerationOptions = {
  provider: AiProvider;
  prompt: string;
  image: {
    buffer: Buffer;
    name: string;
    mimeType: string;
  };
};

export type ImageGenerationResult = {
  base64: string;
  mimeType: string;
  outputSize: string;
  response: unknown;
  usage?: unknown;
  api: string;
  model: string;
};

export async function generateImage({
  provider,
  prompt,
  image,
}: ImageGenerationOptions): Promise<ImageGenerationResult> {
  if (provider === "gemini") {
    const model = getGeminiImageModel();
    const response = await getGemini().interactions.create({
      model,
      input: [
        { type: "text", text: prompt },
        {
          type: "image",
          data: image.buffer.toString("base64"),
          mime_type: image.mimeType,
        },
      ],
      response_format: {
        type: "image",
        mime_type: "image/png",
        aspect_ratio: "9:16",
        image_size: "1K",
        delivery: "inline",
      },
      store: false,
    });
    const base64 = response.output_image?.data;
    if (!base64) throw new Error("IMAGE_GENERATION_EMPTY");
    return {
      base64,
      mimeType: response.output_image?.mime_type || "image/png",
      outputSize: "1K · 9:16",
      response: {
        outputText: response.output_text ?? null,
        imageMimeType: response.output_image?.mime_type ?? null,
        imageBase64: `[표시 제외 · ${Buffer.byteLength(base64, "base64").toLocaleString("en-US")} bytes]`,
      },
      usage: response.usage,
      api: "Gemini Interactions API",
      model,
    };
  }

  const model = getImageModel();
  const upload = await toFile(image.buffer, image.name, { type: image.mimeType });
  const response = await getOpenAI().images.edit({
    model,
    image: upload,
    prompt,
    size: "1024x1536",
    quality: "medium",
    output_format: "png",
  });
  const base64 = response.data?.[0]?.b64_json;
  if (!base64) throw new Error("IMAGE_GENERATION_EMPTY");
  return {
    base64,
    mimeType: "image/png",
    outputSize: "1024x1536",
    response: {
      revisedPrompt: response.data?.[0]?.revised_prompt ?? null,
      outputFormat: response.output_format,
      size: response.size,
      quality: response.quality,
      imageBase64: `[표시 제외 · ${Buffer.byteLength(base64, "base64").toLocaleString("en-US")} bytes]`,
    },
    usage: response.usage,
    api: "OpenAI Images Edit API",
    model,
  };
}
