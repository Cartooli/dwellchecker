import { ExtractionError, type ExtractionResult } from "./types";

export async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  let pdfParse: (data: Buffer) => Promise<{ text: string; numpages: number }>;
  try {
    // Dynamic import so the dependency loads only on the Node runtime
    // (pdf-parse is pure Node.js and fine on Vercel Fluid Compute).
    const mod = (await import("pdf-parse")) as unknown as {
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
