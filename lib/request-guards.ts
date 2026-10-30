import { NextResponse } from "next/server";

const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 8;

export function guardRequest(request: Request): NextResponse | null {
  const configuredPassword = process.env.APP_ACCESS_PASSWORD;
  if (
    configuredPassword &&
    request.headers.get("x-app-password") !== configuredPassword
  ) {
    return NextResponse.json(
      { error: "접근 비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const key = forwarded?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  if (bucket.count >= MAX_REQUESTS) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  bucket.count += 1;
  return null;
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function validateImageFile(value: FormDataEntryValue | null): File {
  if (!(value instanceof File)) {
    throw new Error("IMAGE_REQUIRED");
  }
  if (!SUPPORTED_IMAGE_TYPES.has(value.type)) {
    throw new Error("UNSUPPORTED_IMAGE_TYPE");
  }
  if (value.size === 0 || value.size > MAX_FILE_SIZE) {
    throw new Error("INVALID_IMAGE_SIZE");
  }
  return value;
}

export function publicApiError(error: unknown): {
  message: string;
  status: number;
} {
  const code = error instanceof Error ? error.message : "UNKNOWN";

  if (code === "OPENAI_API_KEY_MISSING") {
    return { message: "서버에 OpenAI API 키가 설정되지 않았습니다.", status: 503 };
  }
  if (code === "GEMINI_API_KEY_MISSING") {
    return { message: "서버에 Gemini API 키가 설정되지 않았습니다.", status: 503 };
  }
  if (code === "IMAGE_REQUIRED") {
    return { message: "필요한 이미지를 모두 첨부해 주세요.", status: 400 };
  }
  if (code === "UNSUPPORTED_IMAGE_TYPE") {
    return { message: "JPEG, PNG, WEBP 이미지만 사용할 수 있습니다.", status: 415 };
  }
  if (code === "INVALID_IMAGE_SIZE") {
    return { message: "이미지는 10MB 이하의 정상 파일이어야 합니다.", status: 413 };
  }
  if (code === "INVALID_MODEL_OUTPUT") {
    return { message: "AI 결과가 제목 규칙을 충족하지 못했습니다. 다시 시도해 주세요.", status: 502 };
  }
  return { message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.", status: 500 };
}
