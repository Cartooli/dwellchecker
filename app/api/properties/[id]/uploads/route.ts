import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { storeInspectionFile } from "@/lib/storage/blob";
import { createIngestionJob } from "@/lib/ingestion/create-job";
import { env } from "@/lib/env";
import { logger } from "@/lib/logging/logger";
import { runNormalizationPipeline } from "@/lib/ingestion/process-pipeline";
import { extractFromBuffer, ExtractionError } from "@/lib/ingestion/extract-text";

export const maxDuration = 60;

/** Magic-byte signatures for allowed file types. */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF

function validateFileType(buffer: Buffer, filename: string, clientType: string | undefined): void {
  const name = filename.toLowerCase();
  const ct = (clientType ?? "").toLowerCase();

  // Text-based formats — no magic bytes to check
  if (name.endsWith(".txt") || name.endsWith(".json") || name.endsWith(".csv")) return;
  if (ct.includes("text") || ct.includes("json") || ct.includes("csv")) return;

  // For PDF, verify magic bytes
  if (name.endsWith(".pdf") || ct.includes("pdf")) {
    if (buffer.length >= PDF_MAGIC.length &&
        PDF_MAGIC.every((b, i) => buffer[i] === b)) {
      return;
    }
    throw new ExtractionError("CORRUPT_PDF", "File does not appear to be a valid PDF.");
  }

  throw new ExtractionError(
    "UNSUPPORTED_FORMAT",
    "Unsupported file type. Upload a PDF, text, JSON, or CSV report."
  );
}

function safeErrorMessage(err: unknown): string {
  if (err instanceof ExtractionError) return err.message;
  if (err instanceof Error) return err.message.slice(0, 200);
  return "An unexpected error occurred.";
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
  const { id: propertyId } = await ctx.params;

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Property not found" } }, { status: 404 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "multipart/form-data required" } }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "file is required" } }, { status: 400 });
  }
  if (file.size > env.UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: { code: "FILE_TOO_LARGE", message: "Exceeds max upload size" } }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Validate file type using magic bytes (not just the client-supplied MIME type)
  try {
    validateFileType(buffer, file.name, file.type);
  } catch (validationErr) {
    if (validationErr instanceof ExtractionError) {
      return NextResponse.json(
        { error: { code: validationErr.code, message: validationErr.message } },
        { status: 422 }
      );
    }
    throw validationErr;
  }

  const blob = await storeInspectionFile(propertyId, file.name, buffer);

  const inspection = await prisma.inspection.create({
    data: {
      propertyId,
      sourceType: "UPLOAD",
      rawReportUrl: blob.url,
      extractedTextStatus: "PENDING",
      normalizationStatus: "PENDING",
    },
  });

  const job = await createIngestionJob({
    propertyId,
    inspectionId: inspection.id,
    fileUrl: blob.url,
  });

  // Inline processing — parse the in-memory buffer directly so we don't need
  // to re-fetch the (private) blob and don't rely on fire-and-forget background
  // fetches which Vercel serverless functions kill at request end.
  let defectCount = 0;
  let processingFailed = false;
  try {
    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: { status: "PROCESSING", stage: "EXTRACTING", startedAt: new Date(), attempts: 1 },
    });

    let extraction;
    try {
      extraction = await extractFromBuffer(buffer, file.type, file.name);
    } catch (extractErr) {
      if (extractErr instanceof ExtractionError) {
        await prisma.inspection.update({
          where: { id: inspection.id },
          data: { extractedTextStatus: "FAILED", normalizationStatus: "SKIPPED" },
        });
        await prisma.ingestionJob.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            stage: "EXTRACTING",
            errorMessage: safeErrorMessage(extractErr),
            finishedAt: new Date(),
          },
        });
        return NextResponse.json(
          { error: { code: extractErr.code, message: extractErr.message } },
          { status: 422 }
        );
      }
      throw extractErr instanceof Error
        ? extractErr
        : new Error(safeErrorMessage(extractErr));
    }

    defectCount = await runNormalizationPipeline({
      text: extraction.text,
      propertyId,
      inspectionId: inspection.id,
    });

    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: { status: "DONE", stage: "DONE", finishedAt: new Date() },
    });
  } catch (ingestErr) {
    processingFailed = true;
    logger.error("inline-ingestion-failed", { jobId: job.id, err: safeErrorMessage(ingestErr) });
    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: safeErrorMessage(ingestErr), finishedAt: new Date() },
    });
  }

    return NextResponse.json(
      {
        uploadUrl: blob.url,
        jobId: job.id,
        inspectionId: inspection.id,
        defectCount,
        processingFailed,
      },
      { status: processingFailed ? 207 : 201 }
    );
  } catch (err) {
    logger.error("upload-failed", { err: safeErrorMessage(err), stack: err instanceof Error ? err.stack : undefined });
    return NextResponse.json(
      { error: { code: "UPLOAD_FAILED", message: "File upload failed. Please try again." } },
      { status: 500 }
    );
  }
}
