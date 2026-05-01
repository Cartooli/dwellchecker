import { gatewayGenerateText } from "@/lib/ai/gateway-generate-text";
import { env } from "@/lib/env";
import { logger } from "@/lib/logging/logger";
import { OCR_EXTRACTION_USER_PROMPT } from "@/lib/ingestion/prompts/ocr-extraction-prompt";
import { ExtractionError, type ExtractionResult } from "./types";

export async function extractViaOcr(
  buffer: Buffer,
  filename: string
): Promise<ExtractionResult> {
  try {
    const result = await gatewayGenerateText({
      operation: "ocr-pdf-extract",
      model: env.OCR_MODEL,
      maxRetries: env.LLM_MAX_RETRIES,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: OCR_EXTRACTION_USER_PROMPT },
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
    logger.error("ocr-extract-failed", { message: rawMsg.slice(0, 500) });
    // Fall through to the same SCANNED_PDF error code so the user experience
    // doesn't fork on infra failures. Operators see details in logs.
    throw new ExtractionError(
      "SCANNED_PDF",
      "This PDF has no readable text. It may be a scanned image. Please upload a text-based report or paste the content."
    );
  }
}
