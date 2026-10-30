import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export function getTextModel(): string {
  return process.env.OPENAI_TEXT_MODEL || "gpt-6-astra";
}

export function getImageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-sunburst";
}
