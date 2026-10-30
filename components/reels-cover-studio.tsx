"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import {
  ArrowCounterClockwise,
  ArrowsLeftRight,
  Check,
  Copy,
  DownloadSimple,
  ImageSquare,
  LockKey,
  SpinnerGap,
  Sparkle,
  TerminalWindow,
  UploadSimple,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import {
  type ChangeEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { AnalysisResult, ReelTitle } from "@/lib/schemas";
import type { AiDebugTrace, WithDebug } from "@/lib/ai-debug";
import { aiProviderLabel, type AiProvider } from "@/lib/ai-provider";
import { countEojeol } from "@/lib/title-validation";

const AiLogPanel = dynamic(
  () => import("@/components/ai-log-panel").then((module) => module.AiLogPanel),
  { ssr: false },
);

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_LOGO_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

type Step = "upload" | "copy" | "editor";
type Busy = "analyze" | "titles" | "caption" | "image" | "download" | null;
type ProgressState = {
  operation: Exclude<Busy, null>;
  current: number;
  total: number;
  label: string;
  shortLabel: string;
};
type Align = "left" | "center" | "right";

type EditorSettings = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  shadow: boolean;
  align: Align;
  x: number;
  y: number;
};

const defaultSettings: EditorSettings = {
  fontFamily: '"Arial Black", "Apple SD Gothic Neo", sans-serif',
  fontSize: 108,
  fontWeight: 900,
  lineHeight: 1.08,
  letterSpacing: -2,
  color: "#ffffff",
  strokeColor: "#111111",
  strokeWidth: 6,
  shadow: true,
  align: "center",
  x: 50,
  y: 70,
};

const angleLabels: Record<string, string> = {
  curiosity: "호기심",
  twist: "반전",
  problem: "문제 제기",
  benefit: "비속어",
  direct: "핵심 직설",
};

function createHeaders(password: string, json = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (password) headers["x-app-password"] = password;
  if (json) headers["content-type"] = "application/json";
  return headers;
}

class ApiRequestError extends Error {
  debug?: AiDebugTrace;

  constructor(message: string, debug?: AiDebugTrace) {
    super(message);
    this.name = "ApiRequestError";
    this.debug = debug;
  }
}

async function readApi<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string; debug?: AiDebugTrace };
  if (!response.ok) throw new ApiRequestError(body.error || "요청을 처리하지 못했습니다.", body.debug);
  return body;
}

function useFilePreview(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);
  return url;
}

function StepRail({ step }: { step: Step }) {
  const items: Array<{ key: Step; label: string }> = [
    { key: "upload", label: "소재 업로드" },
    { key: "copy", label: "AI 카피" },
    { key: "editor", label: "표지 편집" },
  ];
  const current = items.findIndex((item) => item.key === step);
  return (
    <ol className="flex items-center gap-2" aria-label="작업 단계">
      {items.map((item, index) => (
        <li key={item.key} className="flex items-center gap-2">
          <span className={`grid size-7 place-items-center rounded-full border text-xs font-bold ${index <= current ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}>
            {index < current ? <Check size={14} weight="bold" /> : index + 1}
          </span>
          <span className={`hidden text-xs font-semibold md:inline ${index === current ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>{item.label}</span>
          {index < items.length - 1 ? <span className="h-px w-5 bg-[var(--line)] md:w-9" /> : null}
        </li>
      ))}
    </ol>
  );
}

function DropZone({
  index,
  title,
  description,
  file,
  preview,
  onFile,
}: {
  index: number;
  title: string;
  description: string;
  file: File | null;
  preview: string | null;
  onFile: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const selectFile = (candidate?: File) => {
    if (!candidate) return;
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      alert("JPEG, PNG, WEBP 이미지만 선택해 주세요.");
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      alert("이미지 파일은 10MB 이하여야 합니다.");
      return;
    }
    onFile(candidate);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files[0]);
  };

  return (
    <section className="surface overflow-hidden">
      <div className="flex items-start justify-between border-b border-[var(--line)] px-5 py-4">
        <div>
          <p className="text-xs font-bold text-[var(--accent)]">이미지 {index}</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        </div>
        {file ? (
          <button className="icon-button" onClick={() => onFile(null)} aria-label={`${title} 삭제`}>
            <X size={18} />
          </button>
        ) : null}
      </div>
      <div
        className={`relative m-4 grid min-h-80 place-items-center overflow-hidden rounded-[12px] border-2 border-dashed transition-colors ${dragging ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[#c9cfd6] bg-[#f8f9fa]"}`}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {preview ? (
          <>
            <Image src={preview} alt={`${title} 미리보기`} fill unoptimized className="object-contain p-3" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-white/95 px-4 py-3 backdrop-blur">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{file?.name}</p>
                <p className="text-xs text-[var(--muted)]">{file ? (file.size / 1024 / 1024).toFixed(1) : 0}MB</p>
              </div>
              <button className="button-secondary shrink-0" onClick={() => inputRef.current?.click()}>교체</button>
            </div>
          </>
        ) : (
          <button className="flex min-h-80 w-full flex-col items-center justify-center px-6 text-center" onClick={() => inputRef.current?.click()}>
            <span className="grid size-14 place-items-center rounded-full bg-white text-[var(--accent)] shadow-sm"><UploadSimple size={25} weight="bold" /></span>
            <span className="mt-5 font-bold">이미지를 끌어놓거나 선택하세요</span>
            <span className="mt-2 text-sm text-[var(--muted)]">JPEG, PNG, WEBP · 최대 10MB</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event: ChangeEvent<HTMLInputElement>) => selectFile(event.target.files?.[0])}
      />
    </section>
  );
}

function LogoPicker({
  file,
  preview,
  onFile,
}: {
  file: File | null;
  preview: string | null;
  onFile: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const selectFile = (candidate?: File) => {
    if (!candidate) return;
    if (!ACCEPTED_LOGO_TYPES.includes(candidate.type)) {
      alert("PNG, JPEG, WEBP, SVG 로고만 선택해 주세요.");
      return;
    }
    if (candidate.size > MAX_LOGO_FILE_SIZE) {
      alert("로고 파일은 5MB 이하여야 합니다.");
      return;
    }
    onFile(candidate);
  };

  return (
    <section className="rounded-[14px] border border-[var(--line)] bg-[var(--surface-2)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold">로고</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">제목 바로 위에 제목의 왼쪽 경계와 맞춰 배치합니다.</p>
        </div>
        {file ? <button className="icon-button shrink-0" onClick={() => onFile(null)} aria-label="로고 삭제"><X size={17} /></button> : null}
      </div>
      {preview ? (
        <div className="mt-3 flex items-center gap-3 rounded-[12px] border border-[var(--line)] bg-white p-3">
          <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-[linear-gradient(45deg,#eef0f2_25%,transparent_25%),linear-gradient(-45deg,#eef0f2_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eef0f2_75%),linear-gradient(-45deg,transparent_75%,#eef0f2_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px]">
            <Image src={preview} alt="업로드한 로고 미리보기" fill unoptimized className="object-contain p-2" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{file?.name}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{file ? (file.size / 1024 / 1024).toFixed(2) : 0}MB</p>
          </div>
          <button className="button-secondary shrink-0" onClick={() => inputRef.current?.click()}>교체</button>
        </div>
      ) : (
        <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#b9c0c8] bg-white px-4 py-5 text-sm font-bold text-[var(--ink)] hover:border-[var(--accent)]" onClick={() => inputRef.current?.click()}>
          <UploadSimple size={18} weight="bold" /> 로고 파일 선택
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          selectFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
    </section>
  );
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function BusyLabel({ busy, label, progress }: { busy: boolean; label: string; progress: ProgressState | null }) {
  return busy ? (
    <>
      <SpinnerGap className="spinner" size={18} weight="bold" />
      <span>{progress ? `${progress.current}/${progress.total} ${progress.shortLabel}` : "처리 중"}</span>
    </>
  ) : <>{label}</>;
}

function ProgressBanner({ progress }: { progress: ProgressState }) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-operation={progress.operation}
      className="mb-6 rounded-[16px] border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-4 shadow-[0_10px_30px_rgba(232,62,98,.08)] sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[var(--accent)] shadow-sm">
          <SpinnerGap className="spinner" size={21} weight="bold" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="text-sm text-[var(--ink)]">{progress.label}</strong>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[var(--accent)] shadow-sm">
              전체 {progress.total}단계 중 {progress.current}단계
            </span>
          </div>
          <div
            className="mt-3 grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${progress.total}, minmax(0, 1fr))` }}
            aria-hidden="true"
          >
            {Array.from({ length: progress.total }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full transition-colors ${index < progress.current ? "bg-[var(--accent)]" : "bg-white"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProviderSettings({
  textProvider,
  imageProvider,
  disabled,
  onTextProvider,
  onImageProvider,
}: {
  textProvider: AiProvider;
  imageProvider: AiProvider;
  disabled: boolean;
  onTextProvider: (provider: AiProvider) => void;
  onImageProvider: (provider: AiProvider) => void;
}) {
  return (
    <section className="mb-6 flex flex-col gap-4 rounded-[16px] border border-[var(--line)] bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold text-[var(--accent)]">AI API 선택</p>
        <h2 className="mt-1 text-base font-bold">문구와 이미지 공급자를 각각 선택하세요.</h2>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">선택한 공급자의 서버 API 키와 모델 환경변수가 필요합니다.</p>
      </div>
      <div className="grid shrink-0 gap-3 sm:grid-cols-2">
        <label className="min-w-40">
          <span className="label">문구 생성 API</span>
          <select className="field py-2.5!" value={textProvider} disabled={disabled} onChange={(event) => onTextProvider(event.target.value as AiProvider)}>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
        </label>
        <label className="min-w-40">
          <span className="label">이미지 생성 API</span>
          <select className="field py-2.5!" value={imageProvider} disabled={disabled} onChange={(event) => onImageProvider(event.target.value as AiProvider)}>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
        </label>
      </div>
    </section>
  );
}

function TitleOptions({
  titles,
  selectedId,
  onSelect,
}: {
  titles: ReelTitle[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {titles.map((title) => {
        const selected = title.id === selectedId;
        return (
          <button
            key={title.id}
            onClick={() => onSelect(title.id)}
            className={`relative min-h-44 rounded-[16px] border p-4 text-left transition ${selected ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_0_2px_rgba(232,62,98,.12)]" : "border-[var(--line)] bg-white hover:border-[#aeb5bd]"}`}
          >
            <span className="text-xs font-bold text-[var(--accent)]">{angleLabels[title.angle] || title.angle}</span>
            <span className="mt-4 block text-lg font-black leading-[1.35] tracking-tight">
              {title.lines.map((line) => <span key={line} className="block">{line}</span>)}
            </span>
            <span className={`absolute right-3 top-3 grid size-6 place-items-center rounded-full border ${selected ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-transparent"}`}>
              <Check size={13} weight="bold" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function measureTracked(ctx: CanvasRenderingContext2D, text: string, spacing: number) {
  return Array.from(text).reduce((total, char, index, chars) => total + ctx.measureText(char).width + (index < chars.length - 1 ? spacing : 0), 0);
}

function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: Align,
  strokeWidth: number,
) {
  const chars = Array.from(text);
  const width = measureTracked(ctx, text, spacing);
  let cursor = align === "center" ? x - width / 2 : align === "right" ? x - width : x;
  for (const char of chars) {
    if (strokeWidth > 0) ctx.strokeText(char, cursor, y);
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + spacing;
  }
}

function CoverCanvas({
  canvasRef,
  imageUrl,
  logoUrl,
  lines,
  settings,
  showGuides,
  onPosition,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  imageUrl: string;
  logoUrl: string | null;
  lines: string[];
  settings: EditorSettings;
  showGuides: boolean;
  onPosition: (x: number, y: number) => void;
}) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const dragging = useRef(false);

  const draw = useCallback((guides: boolean) => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !image.complete) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);

    const gradient = ctx.createLinearGradient(0, height * 0.42, 0, height);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.68)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height * 0.42, width, height * 0.58);

    const lineStep = settings.fontSize * settings.lineHeight;
    const total = lineStep * (lines.length - 1) + settings.fontSize;
    const firstBaseline = (settings.y / 100) * height - total / 2 + settings.fontSize * 0.84;
    const anchorX = (settings.x / 100) * width;
    ctx.font = `${settings.fontWeight} ${settings.fontSize}px ${settings.fontFamily}`;
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;

    const lineWidths = lines.map((line) => measureTracked(ctx, line, settings.letterSpacing));
    const titleLeft = Math.min(...lineWidths.map((lineWidth) => (
      settings.align === "center" ? anchorX - lineWidth / 2 : settings.align === "right" ? anchorX - lineWidth : anchorX
    )));
    const titleTop = firstBaseline - settings.fontSize * 0.84;
    const logo = logoImageRef.current;
    if (logo?.complete && logo.naturalWidth > 0 && logo.naturalHeight > 0) {
      const aspectRatio = logo.naturalWidth / logo.naturalHeight;
      let logoWidth = Math.min(320, Math.max(180, Math.max(...lineWidths) * 0.55));
      let logoHeight = logoWidth / aspectRatio;
      if (logoHeight > 120) {
        logoHeight = 120;
        logoWidth = logoHeight * aspectRatio;
      }
      const logoX = Math.max(80, Math.min(width - logoWidth - 80, titleLeft));
      const logoY = Math.max(80, titleTop - logoHeight - 28);
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
      ctx.restore();
    }

    ctx.fillStyle = settings.color;
    ctx.strokeStyle = settings.strokeColor;
    ctx.lineWidth = settings.strokeWidth;
    ctx.shadowColor = settings.shadow ? "rgba(0,0,0,0.72)" : "transparent";
    ctx.shadowBlur = settings.shadow ? 24 : 0;
    ctx.shadowOffsetY = settings.shadow ? 10 : 0;

    lines.forEach((line, index) => {
      drawTracked(ctx, line, anchorX, firstBaseline + index * lineStep, settings.letterSpacing, settings.align, settings.strokeWidth);
    });

    if (guides) {
      ctx.save();
      ctx.shadowColor = "transparent";
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 12]);
      ctx.strokeStyle = "rgba(255,255,255,0.72)";
      ctx.strokeRect(80, 140, width - 160, height - 300);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "600 24px sans-serif";
      ctx.fillText("안전 영역", 96, 178);
      ctx.restore();
    }
  }, [canvasRef, lines, settings]);

  useEffect(() => {
    const image = new window.Image();
    image.onload = () => { imageRef.current = image; draw(showGuides); };
    image.src = imageUrl;
    imageRef.current = image;
    return () => { image.onload = null; };
  }, [imageUrl, draw, showGuides]);

  useEffect(() => {
    if (!logoUrl) {
      logoImageRef.current = null;
      draw(showGuides);
      return;
    }
    const logo = new window.Image();
    logo.onload = () => { logoImageRef.current = logo; draw(showGuides); };
    logo.src = logoUrl;
    logoImageRef.current = logo;
    return () => { logo.onload = null; };
  }, [logoUrl, draw, showGuides]);

  useEffect(() => { draw(showGuides); }, [draw, showGuides]);

  const updatePosition = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(8, Math.min(92, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(15, Math.min(88, ((event.clientY - rect.top) / rect.height) * 100));
    onPosition(x, y);
  };

  return (
    <canvas
      ref={canvasRef}
      width={1080}
      height={1920}
      className="aspect-[9/16] h-auto w-full touch-none rounded-[16px] bg-[#1d2024] shadow-[0_24px_70px_rgba(15,18,21,.28)]"
      aria-label="릴스 표지 미리보기. 드래그하여 제목 위치를 바꿀 수 있습니다."
      onPointerDown={(event) => { dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); updatePosition(event); }}
      onPointerMove={(event) => { if (dragging.current) updatePosition(event); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
    />
  );
}

export function ReelsCoverStudio() {
  const [step, setStep] = useState<Step>("upload");
  const [visualFile, setVisualFile] = useState<File | null>(null);
  const [captionFile, setCaptionFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const visualPreview = useFilePreview(visualFile);
  const captionPreview = useFilePreview(captionFile);
  const logoPreview = useFilePreview(logoFile);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedTitleId, setSelectedTitleId] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [settings, setSettings] = useState(defaultSettings);
  const [busy, setBusy] = useState<Busy>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showGuides, setShowGuides] = useState(true);
  const [accessPassword, setAccessPassword] = useState("");
  const [textProvider, setTextProvider] = useState<AiProvider>("openai");
  const [imageProvider, setImageProvider] = useState<AiProvider>("openai");
  const [debugLogs, setDebugLogs] = useState<AiDebugTrace[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setAccessPassword(sessionStorage.getItem("reelcover-access-password") || "");
      setTextProvider(sessionStorage.getItem("reelcover-text-provider") === "gemini" ? "gemini" : "openai");
      setImageProvider(sessionStorage.getItem("reelcover-image-provider") === "gemini" ? "gemini" : "openai");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const selectedTitle = analysis?.titles.find((title) => title.id === selectedTitleId) || analysis?.titles[0];

  const rememberPassword = (value: string) => {
    setAccessPassword(value);
    if (value) sessionStorage.setItem("reelcover-access-password", value);
    else sessionStorage.removeItem("reelcover-access-password");
  };

  const rememberTextProvider = (provider: AiProvider) => {
    setTextProvider(provider);
    sessionStorage.setItem("reelcover-text-provider", provider);
  };

  const rememberImageProvider = (provider: AiProvider) => {
    setImageProvider(provider);
    sessionStorage.setItem("reelcover-image-provider", provider);
  };

  const addDebugLog = (trace?: AiDebugTrace) => {
    if (!trace) return;
    setDebugLogs((current) => [trace, ...current].slice(0, 30));
    setLogOpen(true);
  };

  const showError = (value: unknown) => {
    if (value instanceof ApiRequestError) addDebugLog(value.debug);
    setError(value instanceof Error ? value.message : "요청을 처리하지 못했습니다.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const analyze = async () => {
    if (!visualFile || !captionFile) return;
    setBusy("analyze"); setError(""); setNotice("");
    try {
      setProgress({ operation: "analyze", current: 1, total: 4, label: "업로드한 이미지 2장을 확인하고 전송 데이터를 준비하고 있습니다.", shortLabel: "이미지 준비" });
      const form = new FormData();
      form.append("image1", visualFile);
      form.append("image2", captionFile);
      form.append("textProvider", textProvider);
      await nextPaint();
      setProgress({ operation: "analyze", current: 2, total: 4, label: `${aiProviderLabel(textProvider)}가 이미지 장면과 캡션을 분석하고 제목 5개를 만들고 있습니다.`, shortLabel: "AI 분석" });
      const response = await fetch("/api/analyze", { method: "POST", headers: createHeaders(accessPassword), body: form });
      setProgress({ operation: "analyze", current: 3, total: 4, label: "응답 구조와 제목의 3줄·3어절 규칙을 확인하고 있습니다.", shortLabel: "응답 검증" });
      await nextPaint();
      const result = await readApi<WithDebug<AnalysisResult>>(response);
      const { debug, ...analysisResult } = result;
      addDebugLog(debug);
      setProgress({ operation: "analyze", current: 4, total: 4, label: "제목과 캡션을 작업 화면에 반영하고 있습니다.", shortLabel: "결과 반영" });
      await nextPaint();
      setAnalysis(analysisResult);
      setSelectedTitleId(analysisResult.titles[0].id);
      setStep("copy");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) { showError(reason); } finally { setBusy(null); setProgress(null); }
  };

  const regenerateTitles = async () => {
    if (!analysis) return;
    setBusy("titles"); setError("");
    try {
      setProgress({ operation: "titles", current: 1, total: 3, label: "장면 요약과 캡션을 제목 생성 입력으로 준비하고 있습니다.", shortLabel: "입력 준비" });
      await nextPaint();
      setProgress({ operation: "titles", current: 2, total: 3, label: `${aiProviderLabel(textProvider)}가 서로 다른 후킹 전략의 제목 5개를 만들고 있습니다.`, shortLabel: "제목 생성" });
      const response = await fetch("/api/regenerate-titles", {
        method: "POST",
        headers: createHeaders(accessPassword, true),
        body: JSON.stringify({ sceneSummary: analysis.scene.summary, sourceCaption: analysis.sourceCaption.text, textProvider }),
      });
      setProgress({ operation: "titles", current: 3, total: 3, label: "제목의 3줄·3어절 규칙과 중복 여부를 확인하고 있습니다.", shortLabel: "규칙 검증" });
      await nextPaint();
      const result = await readApi<WithDebug<{ titles: ReelTitle[] }>>(response);
      addDebugLog(result.debug);
      setAnalysis({ ...analysis, titles: result.titles });
      setSelectedTitleId(result.titles[0].id);
    } catch (reason) { showError(reason); } finally { setBusy(null); setProgress(null); }
  };

  const regenerateCaption = async () => {
    if (!analysis) return;
    setBusy("caption"); setError("");
    try {
      setProgress({ operation: "caption", current: 1, total: 3, label: "현재 장면과 원문 캡션을 재작성 입력으로 준비하고 있습니다.", shortLabel: "입력 준비" });
      await nextPaint();
      setProgress({ operation: "caption", current: 2, total: 3, label: `${aiProviderLabel(textProvider)}가 게시용 캡션을 새로 작성하고 있습니다.`, shortLabel: "캡션 생성" });
      const response = await fetch("/api/regenerate-caption", {
        method: "POST",
        headers: createHeaders(accessPassword, true),
        body: JSON.stringify({ sceneSummary: analysis.scene.summary, sourceCaption: analysis.sourceCaption.text, textProvider }),
      });
      setProgress({ operation: "caption", current: 3, total: 3, label: "생성된 캡션을 확인하고 화면에 반영하고 있습니다.", shortLabel: "결과 반영" });
      await nextPaint();
      const result = await readApi<WithDebug<{ newCaption: string }>>(response);
      addDebugLog(result.debug);
      setAnalysis({ ...analysis, newCaption: result.newCaption });
    } catch (reason) { showError(reason); } finally { setBusy(null); setProgress(null); }
  };

  const generateImage = async () => {
    if (!analysis || !visualFile || !selectedTitle) return;
    const isRegeneration = Boolean(backgroundUrl);
    setBusy("image"); setError("");
    try {
      setProgress({ operation: "image", current: 1, total: 4, label: isRegeneration ? "선택된 제목, 참조 이미지와 이전 프롬프트를 새 콘셉트 요청으로 준비하고 있습니다." : "선택된 제목과 참조 이미지를 콘셉트 생성 요청으로 준비하고 있습니다.", shortLabel: "제목·이미지 준비" });
      const form = new FormData();
      form.append("image1", visualFile);
      form.append("visualPrompt", analysis.scene.visualPrompt);
      form.append("selectedTitle", selectedTitle.lines.join("\n"));
      form.append("regenerate", String(isRegeneration));
      form.append("imageProvider", imageProvider);
      await nextPaint();
      setProgress({ operation: "image", current: 2, total: 4, label: isRegeneration ? `${aiProviderLabel(imageProvider)}가 선택된 제목의 핵심을 부각하는 완전히 새로운 콘셉트와 배경을 만들고 있습니다.` : `${aiProviderLabel(imageProvider)}가 선택된 제목의 핵심을 시각화한 프롬프트와 배경을 만들고 있습니다.`, shortLabel: isRegeneration ? "새 콘셉트 생성" : "제목 기반 생성" });
      const response = await fetch("/api/generate-image", { method: "POST", headers: createHeaders(accessPassword), body: form });
      setProgress({ operation: "image", current: 3, total: 4, label: "생성 이미지를 수신하고 PNG 형식과 출력 정보를 확인하고 있습니다.", shortLabel: "결과 확인" });
      await nextPaint();
      const result = await readApi<WithDebug<{ imageDataUrl: string; outputSize: string; visualPrompt: string }>>(response);
      addDebugLog(result.debug);
      setProgress({ operation: "image", current: 4, total: 4, label: "배경 이미지를 표지 편집기에 불러오고 있습니다.", shortLabel: "편집기 반영" });
      await nextPaint();
      setAnalysis({ ...analysis, scene: { ...analysis.scene, visualPrompt: result.visualPrompt } });
      setBackgroundUrl(result.imageDataUrl);
      setStep("editor");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) { showError(reason); } finally { setBusy(null); setProgress(null); }
  };

  const updateTitleLine = (index: number, value: string) => {
    if (!analysis || !selectedTitle) return;
    const titles = analysis.titles.map((title) => title.id === selectedTitle.id ? { ...title, lines: title.lines.map((line, lineIndex) => lineIndex === index ? value : line) } : title);
    setAnalysis({ ...analysis, titles });
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${label}을 복사했습니다.`);
      window.setTimeout(() => setNotice(""), 2400);
    } catch { setNotice("자동 복사에 실패했습니다. 텍스트를 직접 선택해 주세요."); }
  };

  const download = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedTitle) return;
    setBusy("download");
    setProgress({ operation: "download", current: 1, total: 3, label: "편집 보조선과 안전 영역 표시를 숨기고 최종 표지를 준비하고 있습니다.", shortLabel: "표지 준비" });
    const previousGuides = showGuides;
    setShowGuides(false);
    await nextPaint();
    setProgress({ operation: "download", current: 2, total: 3, label: "표지를 1080×1920 PNG 파일로 변환하고 있습니다.", shortLabel: "PNG 변환" });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    canvas.toBlob(async (blob) => {
      if (blob) {
        setProgress({ operation: "download", current: 3, total: 3, label: "다운로드 파일을 만들고 브라우저에 전달하고 있습니다.", shortLabel: "파일 저장" });
        await nextPaint();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const stamp = new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replaceAll("-", "");
        link.href = url;
        link.download = `reels_cover_${stamp}_001.png`;
        link.click();
        URL.revokeObjectURL(url);
      }
      setShowGuides(previousGuides);
      setBusy(null);
      setProgress(null);
    }, "image/png");
  };

  const resetAll = () => {
    if (!confirm("현재 작업을 지우고 처음부터 시작할까요?")) return;
    setStep("upload"); setVisualFile(null); setCaptionFile(null); setLogoFile(null); setAnalysis(null); setBackgroundUrl(""); setError(""); setNotice(""); setSettings(defaultSettings); setBusy(null); setProgress(null);
  };

  return (
    <main className="min-h-[100dvh]">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6">
          <button aria-label="ReelCover Studio" className="flex shrink-0 items-center gap-3 text-left" onClick={() => step !== "upload" && setStep("upload")}>
            <span className="grid size-9 place-items-center rounded-[12px] bg-[var(--ink)] text-white"><ImageSquare size={19} weight="fill" /></span>
            <span className="hidden sm:block"><strong className="block text-sm tracking-tight">ReelCover Studio</strong><span className="hidden text-xs text-[var(--muted)] lg:block">AI 릴스 표지 제작실</span></span>
          </button>
          <StepRail step={step} />
          <div className="flex items-center gap-1 sm:gap-2">
            <button className="button-secondary relative min-h-9! px-2.5!" onClick={() => setLogOpen(true)} aria-label={`AI 요청 로그 ${debugLogs.length}건`}>
              <TerminalWindow size={17} /><span className="hidden lg:inline">로그</span>
              {debugLogs.length ? <span className="grid min-w-5 place-items-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold leading-5 text-white">{debugLogs.length}</span> : null}
            </button>
            <button className="button-quiet" onClick={resetAll}><ArrowCounterClockwise size={17} /> <span className="hidden sm:inline">다시 시작</span></button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 sm:py-10">
        {progress ? <ProgressBanner progress={progress} /> : null}
        {error ? (
          <div role="alert" className="mb-6 flex items-start justify-between gap-3 rounded-[12px] border border-red-200 bg-red-50 p-4 text-sm text-[var(--danger)]">
            <span className="flex gap-2"><WarningCircle className="mt-0.5 shrink-0" size={18} weight="fill" />{error}</span>
            <button onClick={() => setError("")} aria-label="오류 닫기"><X size={17} /></button>
          </div>
        ) : null}
        {notice ? <div aria-live="polite" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-[12px] bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white shadow-xl">{notice}</div> : null}
        <ProviderSettings
          textProvider={textProvider}
          imageProvider={imageProvider}
          disabled={busy !== null}
          onTextProvider={rememberTextProvider}
          onImageProvider={rememberImageProvider}
        />

        {step === "upload" ? (
          <>
            <section className="mb-8 max-w-3xl">
              <p className="text-sm font-bold text-[var(--accent)]">스크린샷 2장으로 시작</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-5xl">표지와 캡션을 한 흐름에서 완성하세요.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">첫 이미지는 장면을, 두 번째 이미지는 원문 캡션을 읽습니다. AI는 글자 없는 배경만 만들고 한글 제목은 편집기에서 정확히 올립니다.</p>
            </section>
            <div className="relative grid gap-4 lg:grid-cols-2">
              <DropZone index={1} title="이미지 소재 스크린샷" description="릴스에 사용할 핵심 장면과 피사체" file={visualFile} preview={visualPreview} onFile={setVisualFile} />
              <DropZone index={2} title="캡션 스크린샷" description="원문 캡션이 잘리지 않게 담긴 화면" file={captionFile} preview={captionPreview} onFile={setCaptionFile} />
              <button
                className="icon-button absolute left-1/2 top-1/2 z-10 hidden! -translate-x-1/2 -translate-y-1/2 shadow-md lg:inline-flex!"
                onClick={() => { const first = visualFile; setVisualFile(captionFile); setCaptionFile(first); }}
                disabled={!visualFile && !captionFile}
                aria-label="두 이미지 교환"
              ><ArrowsLeftRight size={19} weight="bold" /></button>
            </div>
            <div className="mt-5 flex flex-col items-stretch justify-between gap-4 rounded-[16px] border border-[var(--line)] bg-white p-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3 text-sm text-[var(--muted)]">
                <LockKey className="mt-0.5 shrink-0 text-[var(--accent)]" size={18} weight="fill" />
                <p>업로드 이미지는 장기 저장하지 않습니다. 업로드할 콘텐츠의 이용 권한을 확인해 주세요. AI 호출 비용이 발생합니다.</p>
              </div>
              <button className="button-primary shrink-0" disabled={!visualFile || !captionFile || busy !== null} onClick={analyze}>
                <Sparkle size={18} weight="fill" /><BusyLabel busy={busy === "analyze"} label="분석 및 콘텐츠 생성" progress={busy === "analyze" ? progress : null} />
              </button>
            </div>
            <details className="mt-5 max-w-md">
              <summary className="cursor-pointer text-xs font-semibold text-[var(--muted)]">접근 비밀번호 설정</summary>
              <label className="mt-3 block">
                <span className="label">서버 접근 비밀번호</span>
                <input type="password" className="field" value={accessPassword} onChange={(event) => rememberPassword(event.target.value)} placeholder="배포 환경에서 설정한 경우만 입력" autoComplete="current-password" />
              </label>
            </details>
          </>
        ) : null}

        {step === "copy" && analysis ? (
          <div className="space-y-6">
            <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><p className="text-sm font-bold text-[var(--accent)]">AI 분석 완료</p><h1 className="mt-1 text-3xl font-black tracking-[-0.04em]">카피를 검토하고 한 가지 제목을 고르세요.</h1></div>
              <button className="button-primary" onClick={generateImage} disabled={busy !== null}><Sparkle size={18} weight="fill" /><BusyLabel busy={busy === "image"} label="배경 이미지 생성" progress={busy === "image" ? progress : null} /></button>
            </section>
            <section className="surface grid overflow-hidden lg:grid-cols-[300px_1fr]">
              <div className="relative min-h-72 bg-[#e9ecef]">
                {visualPreview ? <Image src={visualPreview} alt="이미지 소재 미리보기" fill unoptimized className="object-contain p-4" /> : null}
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-xs font-bold text-[var(--accent)]">장면 분석</p>
                <h2 className="mt-2 text-xl font-bold">{analysis.scene.subject}</h2>
                <p className="mt-3 leading-7 text-[var(--muted)]">{analysis.scene.summary}</p>
                <p className="mt-5 rounded-[12px] bg-[var(--surface-2)] p-4 text-sm leading-6 text-[var(--muted)]">AI가 원본을 픽셀 단위로 복원하지는 않습니다. 중요한 얼굴이나 제품의 충실도는 생성 후 확인해 주세요.</p>
              </div>
            </section>
            <section className="surface p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-[var(--accent)]">제목 후보 5개</p><h2 className="mt-1 text-xl font-bold">각 줄을 정확히 3어절로 만들었어요.</h2></div><button className="button-secondary" onClick={regenerateTitles} disabled={busy !== null}><ArrowCounterClockwise size={17} /><BusyLabel busy={busy === "titles"} label="제목 다시 생성" progress={busy === "titles" ? progress : null} /></button></div>
              <TitleOptions titles={analysis.titles} selectedId={selectedTitleId} onSelect={setSelectedTitleId} />
            </section>
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="surface p-5 sm:p-6">
                <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold text-[var(--accent)]">인식한 원문</p><h2 className="mt-1 text-lg font-bold">캡션 스크린샷</h2></div>{analysis.sourceCaption.isTruncated ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">잘림 가능성 있음</span> : null}</div>
                <textarea className="field min-h-72 resize-y leading-6" value={analysis.sourceCaption.text} onChange={(event) => setAnalysis({ ...analysis, sourceCaption: { ...analysis.sourceCaption, text: event.target.value } })} />
                {analysis.sourceCaption.uncertainSpans.length ? <p className="mt-3 text-xs leading-5 text-amber-800">확인이 필요한 부분: {analysis.sourceCaption.uncertainSpans.join(", ")}</p> : null}
              </section>
              <section className="surface p-5 sm:p-6">
                <div className="mb-3 flex items-center justify-between gap-2"><div><p className="text-xs font-bold text-[var(--accent)]">새 캡션</p><h2 className="mt-1 text-lg font-bold">게시 전 자유롭게 수정하세요.</h2></div><div className="flex gap-2"><button className="icon-button" onClick={() => copyText(analysis.newCaption, "캡션")} aria-label="캡션 복사"><Copy size={18} /></button><button className={busy === "caption" ? "button-secondary px-3!" : "icon-button"} onClick={regenerateCaption} disabled={busy !== null} aria-label="캡션 다시 생성">{busy === "caption" ? <><SpinnerGap className="spinner" size={18} /><span className="text-xs font-black">{progress?.current}/{progress?.total}</span></> : <ArrowCounterClockwise size={18} />}</button></div></div>
                <textarea className="field min-h-72 resize-y leading-6" value={analysis.newCaption} onChange={(event) => setAnalysis({ ...analysis, newCaption: event.target.value })} />
              </section>
            </div>
          </div>
        ) : null}

        {step === "editor" && analysis && selectedTitle && backgroundUrl ? (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(360px,600px)_minmax(420px,1fr)]">
            <section className="xl:sticky xl:top-24">
              <div className="mx-auto max-w-[520px]">
                <div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-bold text-[var(--accent)]">표지 미리보기</p><p className="text-xs text-[var(--muted)]">캔버스 위를 드래그해 제목을 이동하세요.</p></div><label className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]"><input type="checkbox" checked={showGuides} onChange={(event) => setShowGuides(event.target.checked)} className="accent-[var(--accent)]" /> 안전 영역</label></div>
                <CoverCanvas canvasRef={canvasRef} imageUrl={backgroundUrl} logoUrl={logoPreview} lines={selectedTitle.lines} settings={settings} showGuides={showGuides} onPosition={(x, y) => setSettings({ ...settings, x, y })} />
                <p className="mt-3 text-center text-xs text-[var(--muted)]">내보내기: PNG 1080 × 1920px</p>
              </div>
            </section>
            <section className="surface overflow-hidden">
              <div className="border-b border-[var(--line)] p-5 sm:p-6"><p className="text-xs font-bold text-[var(--accent)]">제목 오버레이</p><h1 className="mt-1 text-2xl font-black tracking-tight">글자를 화면에 맞게 조정하세요.</h1></div>
              <div className="space-y-6 p-5 sm:p-6">
                <div className="space-y-3">
                  {selectedTitle.lines.map((line, index) => (
                    <label key={index} className="block"><span className="label">{index + 1}번째 줄 <span className={countEojeol(line) === 3 ? "text-[var(--success)]" : "text-[var(--danger)]"}>{countEojeol(line)}어절</span></span><input className="field text-lg font-bold" value={line} onChange={(event) => updateTitleLine(index, event.target.value)} /></label>
                  ))}
                  {selectedTitle.lines.some((line) => countEojeol(line) !== 3) ? <p className="flex items-start gap-2 text-xs leading-5 text-[var(--danger)]"><WarningCircle className="mt-0.5 shrink-0" size={15} />3어절 규칙을 벗어났습니다. 저장은 가능하지만 모바일 가독성을 확인하세요.</p> : null}
                </div>
                <LogoPicker file={logoFile} preview={logoPreview} onFile={setLogoFile} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <label><span className="label">폰트</span><select className="field" value={settings.fontFamily} onChange={(event) => setSettings({ ...settings, fontFamily: event.target.value })}><option value={'"Arial Black", "Apple SD Gothic Neo", sans-serif'}>굵은 고딕</option><option value={'"Apple SD Gothic Neo", "Noto Sans KR", sans-serif'}>시스템 고딕</option><option value={'Impact, "Arial Black", sans-serif'}>Impact</option></select></label>
                  <label><span className="label">정렬</span><select className="field" value={settings.align} onChange={(event) => setSettings({ ...settings, align: event.target.value as Align })}><option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option></select></label>
                  <label><span className="label">글자 색</span><input className="field h-12 p-1" type="color" value={settings.color} onChange={(event) => setSettings({ ...settings, color: event.target.value })} /></label>
                  <label><span className="label">외곽선 색</span><input className="field h-12 p-1" type="color" value={settings.strokeColor} onChange={(event) => setSettings({ ...settings, strokeColor: event.target.value })} /></label>
                </div>
                {[
                  ["글자 크기", "fontSize", 64, 164, 2, `${settings.fontSize}px`],
                  ["행간", "lineHeight", 0.9, 1.5, 0.02, settings.lineHeight.toFixed(2)],
                  ["자간", "letterSpacing", -6, 16, 1, `${settings.letterSpacing}px`],
                  ["외곽선", "strokeWidth", 0, 16, 1, `${settings.strokeWidth}px`],
                  ["가로 위치", "x", 8, 92, 1, `${Math.round(settings.x)}%`],
                  ["세로 위치", "y", 15, 88, 1, `${Math.round(settings.y)}%`],
                ].map(([label, key, min, max, stepValue, display]) => (
                  <label key={String(key)} className="block"><span className="label flex! justify-between"><span>{label}</span><span className="text-[var(--muted)]">{display}</span></span><input type="range" className="range" min={Number(min)} max={Number(max)} step={Number(stepValue)} value={settings[key as keyof EditorSettings] as number} onChange={(event) => setSettings({ ...settings, [key as string]: Number(event.target.value) })} /></label>
                ))}
                <label className="flex items-center justify-between rounded-[12px] border border-[var(--line)] p-4"><span><strong className="block text-sm">글자 그림자</strong><span className="text-xs text-[var(--muted)]">밝은 배경에서도 제목을 읽기 쉽게 합니다.</span></span><input type="checkbox" checked={settings.shadow} onChange={(event) => setSettings({ ...settings, shadow: event.target.checked })} className="size-5 accent-[var(--accent)]" /></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button className="button-secondary" disabled={busy !== null} onClick={generateImage}><ArrowCounterClockwise size={18} /><BusyLabel busy={busy === "image"} label="배경 다시 생성" progress={busy === "image" ? progress : null} /></button>
                  <button className="button-primary" disabled={busy !== null} onClick={download}><DownloadSimple size={18} weight="bold" /><BusyLabel busy={busy === "download"} label="PNG 다운로드" progress={busy === "download" ? progress : null} /></button>
                  <button className="button-secondary" onClick={() => copyText(selectedTitle.lines.join("\n"), "제목")}><Copy size={18} />제목 복사</button>
                  <button className="button-secondary" onClick={() => copyText(analysis.newCaption, "캡션")}><Copy size={18} />캡션 복사</button>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
      <AiLogPanel open={logOpen} logs={debugLogs} onClose={() => setLogOpen(false)} onClear={() => setDebugLogs([])} />
    </main>
  );
}
