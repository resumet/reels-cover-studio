"use client";

import {
  CaretDown,
  CheckCircle,
  Copy,
  TerminalWindow,
  Trash,
  X,
  XCircle,
} from "@phosphor-icons/react";

import type { AiDebugTrace } from "@/lib/ai-debug";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function PromptBlock({ label, value }: { label: string; value: string }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold text-[#aeb7c2]">{label}</h4>
        <button
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#aeb7c2] hover:bg-white/10 hover:text-white"
          onClick={() => navigator.clipboard.writeText(value)}
        >
          <Copy size={13} /> 복사
        </button>
      </div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-[12px] border border-white/10 bg-black/30 p-3 font-mono text-xs leading-5 text-[#e5e9ee]">
        {value}
      </pre>
    </section>
  );
}

function TraceCard({ trace, initiallyOpen }: { trace: AiDebugTrace; initiallyOpen: boolean }) {
  return (
    <details className="group overflow-hidden rounded-[12px] border border-white/10 bg-[#171b20]" open={initiallyOpen}>
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 marker:content-none">
        <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-[#252b32] text-[#ff6b89]">
          <TerminalWindow size={17} weight="bold" />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-sm text-white">{trace.operation}</strong>
          <span className="mt-0.5 block truncate text-xs text-[#8d98a5]">{trace.model} · {formatTime(trace.createdAt)}</span>
        </span>
        <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] font-semibold text-[#aeb7c2]">{trace.attempts.length}회</span>
        <CaretDown className="text-[#8d98a5] transition-transform group-open:rotate-180" size={16} />
      </summary>

      <div className="space-y-5 border-t border-white/10 p-4">
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[#c7ced6]">{trace.api}</span>
          {trace.settings
            ? Object.entries(trace.settings).map(([key, value]) => (
                <span key={key} className="rounded-full bg-white/5 px-2.5 py-1 text-[#c7ced6]">{key}: {String(value)}</span>
              ))
            : null}
        </div>

        {trace.attachments?.length ? (
          <section>
            <h4 className="mb-2 text-xs font-bold text-[#aeb7c2]">첨부 입력</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {trace.attachments.map((attachment) => (
                <div key={`${attachment.label}-${attachment.name}`} className="rounded-[10px] border border-white/10 bg-black/20 p-3 text-xs">
                  <strong className="block text-[#e5e9ee]">{attachment.label}</strong>
                  <span className="mt-1 block truncate text-[#8d98a5]">{attachment.name}</span>
                  <span className="mt-1 block text-[#8d98a5]">{attachment.type} · {formatBytes(attachment.size)}{attachment.detail ? ` · detail ${attachment.detail}` : ""}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {trace.systemPrompt ? <PromptBlock label="System 프롬프트" value={trace.systemPrompt} /> : null}

        {trace.attempts.map((attempt) => (
          <section key={attempt.attempt} className="space-y-4 rounded-[12px] border border-white/10 p-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-xs font-bold text-white">요청 {attempt.attempt}</h4>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${attempt.accepted ? "text-[#66d19e]" : "text-[#ff8b8b]"}`}>
                {attempt.accepted ? <CheckCircle size={15} weight="fill" /> : <XCircle size={15} weight="fill" />}
                {attempt.accepted ? "검증 통과" : "재시도"}
              </span>
            </div>
            <PromptBlock label="User 프롬프트" value={attempt.userPrompt} />
            <PromptBlock label="AI 응답" value={pretty(attempt.response)} />
            {attempt.usage ? <PromptBlock label="사용량" value={pretty(attempt.usage)} /> : null}
            {attempt.responseId ? <p className="break-all font-mono text-[11px] text-[#727e8b]">response_id: {attempt.responseId}</p> : null}
          </section>
        ))}
      </div>
    </details>
  );
}

export function AiLogPanel({
  open,
  logs,
  onClose,
  onClear,
}: {
  open: boolean;
  logs: AiDebugTrace[];
  onClose: () => void;
  onClear: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30" role="presentation" onMouseDown={onClose}>
      <aside
        aria-label="AI 요청 로그"
        className="ml-auto flex h-[100dvh] w-full max-w-2xl flex-col border-l border-white/10 bg-[#101316] text-white shadow-[-24px_0_80px_rgba(0,0,0,.28)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-white/10 px-4 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-[10px] bg-[#252b32] text-[#ff6b89]"><TerminalWindow size={19} weight="bold" /></span>
            <div><h2 className="text-sm font-bold">AI 요청 로그</h2><p className="text-xs text-[#8d98a5]">공급자별 프롬프트와 구조화된 응답 · {logs.length}건</p></div>
          </div>
          <div className="flex gap-2">
            <button className="grid size-9 place-items-center rounded-[10px] border border-white/10 text-[#aeb7c2] hover:bg-white/10 hover:text-white" onClick={onClear} aria-label="로그 전체 삭제" disabled={!logs.length}><Trash size={17} /></button>
            <button className="grid size-9 place-items-center rounded-[10px] border border-white/10 text-[#aeb7c2] hover:bg-white/10 hover:text-white" onClick={onClose} aria-label="로그 닫기"><X size={17} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {logs.length ? (
            <div className="space-y-3">
              {logs.map((trace, index) => (
                <TraceCard key={`${trace.createdAt}-${trace.operation}-${index}`} trace={trace} initiallyOpen={index === 0} />
              ))}
            </div>
          ) : (
            <div className="grid min-h-full place-items-center px-8 text-center">
              <div><TerminalWindow className="mx-auto text-[#4d5864]" size={42} /><h3 className="mt-4 font-bold">아직 기록된 요청이 없습니다.</h3><p className="mt-2 text-sm leading-6 text-[#8d98a5]">분석, 제목 재생성, 캡션 재생성 또는 배경 생성을 실행하면 여기에 표시됩니다.</p></div>
            </div>
          )}
        </div>

        <footer className="border-t border-white/10 px-5 py-3 text-xs leading-5 text-[#727e8b]">
          API 키와 이미지 Base64 원문은 표시하지 않습니다. 캡션과 프롬프트에는 사용자가 입력한 내용이 포함될 수 있습니다.
        </footer>
      </aside>
    </div>
  );
}
