import type { RawFinding } from "@/types/api";

export function parseSections(text: string): RawFinding[] {
  if (!text) return [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 20);

  return lines.map((l) => ({ rawText: l }));
}
