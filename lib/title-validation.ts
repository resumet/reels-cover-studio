import type { ReelTitle } from "@/lib/schemas";

export function normalizeTitleLine(line: string): string {
  return line.trim().replace(/\s+/gu, " ");
}

export function countEojeol(line: string): number {
  const normalized = normalizeTitleLine(line);
  return normalized ? normalized.split(" ").length : 0;
}

export function validTitle(lines: string[]): boolean {
  return lines.length === 3 && lines.every((line) => countEojeol(line) === 3);
}

export function normalizeTitles(titles: ReelTitle[]): ReelTitle[] {
  return titles.map((title, index) => ({
    ...title,
    id: `t${index + 1}`,
    lines: title.lines.map(normalizeTitleLine),
  }));
}

export function validTitleSet(titles: ReelTitle[]): boolean {
  if (titles.length !== 5 || !titles.every((title) => validTitle(title.lines))) {
    return false;
  }

  return new Set(titles.map((title) => title.lines.join("\n"))).size === 5;
}
