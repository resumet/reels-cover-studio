export type AiDebugAttachment = {
  label: string;
  name: string;
  type: string;
  size: number;
  detail?: string;
};

export type AiDebugAttempt = {
  attempt: number;
  userPrompt: string;
  response: unknown;
  accepted: boolean;
  responseId?: string;
  usage?: unknown;
};

export type AiDebugTrace = {
  operation: string;
  api: string;
  model: string;
  createdAt: string;
  systemPrompt?: string;
  attachments?: AiDebugAttachment[];
  settings?: Record<string, unknown>;
  attempts: AiDebugAttempt[];
};

export type WithDebug<T> = T & { debug: AiDebugTrace };
