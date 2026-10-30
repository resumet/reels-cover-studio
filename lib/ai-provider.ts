export const aiProviders = ["openai", "gemini"] as const;

export type AiProvider = (typeof aiProviders)[number];

export function parseAiProvider(value: unknown): AiProvider {
  return value === "gemini" ? "gemini" : "openai";
}

export function aiProviderLabel(provider: AiProvider): string {
  return provider === "gemini" ? "Gemini" : "OpenAI";
}
