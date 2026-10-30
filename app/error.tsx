"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[var(--canvas)] px-5">
      <section className="surface max-w-md p-8 text-center">
        <p className="text-sm font-semibold text-[var(--accent)]">오류가 발생했습니다</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">작업 화면을 불러오지 못했어요.</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">진행 중이던 입력을 확인한 뒤 다시 시도해 주세요.</p>
        <button className="button-primary mt-6" onClick={reset}>다시 시도</button>
      </section>
    </main>
  );
}
