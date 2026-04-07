import { generateText } from "ai";
import { env } from "@/lib/env";
import { ExtractionError, type ExtractionResult } from "./types";

const OCR_PROMPT =
  "Extract all visible text from this property inspection report. Return plain text only, preserving section headings and line breaks. Do not summarize. Do not add commentary. If the document is blank or contains no readable text, return the single word NONE.";

export async function extractViaOcr(
  buffer: Buffer,
  filename: string
): Promise<ExtractionResult> {
  try {
    const result = await generateText({
      model: env.OCR_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: OCR_PROMPT },
            {
              type: "file",
              data: new Uint8Array(buffer),
              mediaType: "application/pdf",
              filename,
            },
          ],
        },
      ],
    });

    const text = (result.text ?? "").trim();

    if (!text || text === "NONE" || text.length < 50) {
      throw new ExtractionError(
        "SCANNED_PDF",
        "This PDF has no readable text, even after OCR. Please upload a text-based report or paste the content."
      );
    }

    return {
      text,
      method: "pdf",
      warnings: ["extracted-via-ocr"],
    };
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    const rawMsg = err instanceof Error ? err.message : String(err);
    console.error("[ocr-extract] failed:", rawMsg);
    // Fall through to the same SCANNED_PDF error code so the user experience
    // doesn't fork on infra failures. Operators see details in logs.
    throw new ExtractionError(
      "SCANNED_PDF",
      "This PDF has no readable text. It may be a scanned image. Please upload a text-based report or paste the content."
    );
  }
}
