import { ExtractionError, type ExtractionResult } from "./types";

export async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  let pdfParse: (data: Buffer) => Promise<{ text: string; numpages: number }>;
  try {
    // Import the inner module path to avoid pdf-parse v1.1.1's root-level
    // debug code that tries to read a test fixture on module load.
    // @ts-expect-error - deep import has no types
    const mod = await import("pdf-parse/lib/pdf-parse.js");
    pdfParse = (mod.default ?? mod) as typeof pdfParse;
  } catch (err) {
    throw new ExtractionError(
      "UNSUPPORTED_FORMAT",
      `PDF extractor failed to load: ${String(err)}`
    );
  }

  let parsed: { text: string; numpages: number };
  try {
    parsed = await pdfParse(buffer);
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const msg = rawMsg.toLowerCase();
    console.error("[pdf-extract] parse failed:", rawMsg, err);
    if (msg.includes("password") || msg.includes("encrypted")) {
      throw new ExtractionError(
        "PASSWORD_PROTECTED",
        "This PDF is password-protected. Please upload an unlocked copy."
      );
    }
    throw new ExtractionError(
      "CORRUPT_PDF",
      `We couldn't read this PDF: ${rawMsg}`
    );
  }

  const text = (parsed.text ?? "").trim();
  const warnings: string[] = [];

  if (!text || text.length < 50) {
    throw new ExtractionError(
      "SCANNED_PDF",
      "This PDF has no readable text. It may be a scanned image. Please upload a text-based report or paste the content."
    );
  }

  return {
    text,
    method: "pdf",
    pageCount: parsed.numpages,
    warnings,
  };
}
