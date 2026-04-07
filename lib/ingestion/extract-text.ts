import { extractPdf } from "./extractors/pdf-extractor";
import { extractTextFile } from "./extractors/text-extractor";
import { ExtractionError, type ExtractionResult } from "./extractors/types";

export { ExtractionError, type ExtractionResult };

export async function extractFromBuffer(
  buffer: Buffer,
  contentType: string | undefined,
  filename: string
): Promise<ExtractionResult> {
  const ct = (contentType ?? "").toLowerCase();
  const name = filename.toLowerCase();

  if (ct.includes("pdf") || name.endsWith(".pdf")) {
    return extractPdf(buffer, filename);
  }
  if (ct.includes("json") || name.endsWith(".json")) {
    return extractTextFile(buffer, "json");
  }
  if (ct.includes("csv") || name.endsWith(".csv")) {
    return extractTextFile(buffer, "csv");
  }
  if (ct.includes("text") || name.endsWith(".txt")) {
    return extractTextFile(buffer, "text");
  }

  throw new ExtractionError(
    "UNSUPPORTED_FORMAT",
    `Unsupported file type: ${contentType || "unknown"}. Upload a PDF or text report.`
  );
}

// Legacy helper kept for compatibility with the old background worker route.
// Real extraction now happens inline in the upload route using `extractFromBuffer`.
export async function extractText(_fileUrl: string): Promise<string> {
  return "";
}
