import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { storeInspectionFile } from "@/lib/storage/blob";
import { createIngestionJob } from "@/lib/ingestion/create-job";
import { env } from "@/lib/env";
import { logger } from "@/lib/logging/logger";

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

  // Trigger processing in the background (fire-and-forget).
  const baseUrl = env.NEXT_PUBLIC_APP_URL;
  fetch(`${baseUrl}/api/ingestion/jobs/${job.id}/process`, {
    method: "POST",
    headers: { "x-internal-secret": env.INTERNAL_JOB_SECRET },
  }).catch(() => {});

    return NextResponse.json({
      uploadUrl: blob.url,
      jobId: job.id,
      inspectionId: inspection.id,
    });
  } catch (err) {
    logger.error("upload-failed", { err: String(err), stack: err instanceof Error ? err.stack : undefined });
    return NextResponse.json(
      { error: { code: "UPLOAD_FAILED", message: String(err) } },
      { status: 500 }
    );
  }
}
