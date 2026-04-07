import { ExtractionError, type ExtractionResult } from "./types";

export async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  let extractText: (
    data: Uint8Array,
    options?: { mergePages?: boolean }
  ) => Promise<{ text: string | string[]; totalPages: number }>;

  try {
    const mod = await import("unpdf");
    extractText = mod.extractText as typeof extractText;
  } catch (err) {
    throw new ExtractionError(
      "UNSUPPORTED_FORMAT",
      `PDF extractor failed to load: ${String(err)}`
    );
  }

  let result: { text: string | string[]; totalPages: number };
  try {
    result = await extractText(new Uint8Array(buffer), { mergePages: true });
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    console.error("[pdf-extract] parse failed:", rawMsg);
    if (/password|encrypted/i.test(rawMsg)) {
      throw new ExtractionError(
        "PASSWORD_PROTECTED",
        "This PDF is password-protected. Please upload an unlocked copy."
      );
    }
    throw new ExtractionError(
      "CORRUPT_PDF",
      "We couldn't read this PDF. It may be corrupt or in an unsupported format."
    );
  }

  const text = (Array.isArray(result.text) ? result.text.join("\n") : result.text).trim();

  if (!text || text.length < 50) {
    throw new ExtractionError(
      "SCANNED_PDF",
      "This PDF has no readable text. It may be a scanned image. Please upload a text-based report or paste the content."
    );
  }

  return {
    text,
    method: "pdf",
    pageCount: result.totalPages,
    warnings: [],
  };
}
