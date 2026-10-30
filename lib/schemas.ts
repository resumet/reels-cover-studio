import { z } from "zod";

export const titleAngles = [
  "curiosity",
  "twist",
  "problem",
  "benefit",
  "direct",
] as const;

export const titleSchema = z.object({
  id: z.string(),
  angle: z.enum(titleAngles),
  lines: z.array(z.string()).length(3),
});

export const sceneSchema = z.object({
  summary: z.string(),
  subject: z.string(),
  visualPrompt: z.string(),
});

export const sourceCaptionSchema = z.object({
  text: z.string(),
  isTruncated: z.boolean(),
  uncertainSpans: z.array(z.string()),
});

export const analysisSchema = z.object({
  scene: sceneSchema,
  sourceCaption: sourceCaptionSchema,
  titles: z.array(titleSchema).length(5),
  newCaption: z.string(),
});

export const titlesResponseSchema = z.object({
  titles: z.array(titleSchema).length(5),
});

export const captionResponseSchema = z.object({
  newCaption: z.string(),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;
export type ReelTitle = z.infer<typeof titleSchema>;
