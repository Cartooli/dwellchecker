import { ExtractionError, type ExtractionResult } from "./types";

export async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  let pdfParse: (data: Buffer) => Promise<{ text: string; numpages: number }>;
  try {
    // Import the inner module path to avoid pdf-parse v1.1.1's root-level
    // debug code that tries to read a test fixture on module load.
    const mod = (await import("pdf-parse/lib/pdf-parse.js")) as unknown as {
      default: (data: Buffer) => Promise<{ text: string; numpages: number }>;
    };
    pdfParse = mod.default;
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
    const msg = String(err).toLowerCase();
    if (msg.includes("password") || msg.includes("encrypted")) {
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
