import type { ExtractionResult } from "./types";

export async function extractTextFile(
  buffer: Buffer,
  mime: "text" | "json" | "csv"
): Promise<ExtractionResult> {
  const text = buffer.toString("utf8");
  return { text, method: mime, warnings: [] };
}
