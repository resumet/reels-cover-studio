import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export function getGeminiTextModel(): string {
  return process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
}

export function getGeminiImageModel(): string {
  return process.env.GEMINI_IMAGE_MODEL || "gemini-nano-banana-2.1";
}
