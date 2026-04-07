import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { storeInspectionFile } from "@/lib/storage/blob";
import { createIngestionJob } from "@/lib/ingestion/create-job";
import { env } from "@/lib/env";
import { logger } from "@/lib/logging/logger";
import { parseSections } from "@/lib/ingestion/parse-sections";
import { mapRawFindings } from "@/lib/normalization/map-raw-findings";
import { dedupeDefects } from "@/lib/normalization/dedupe-defects";
import { recomputePropertyConditionProfile } from "@/lib/scoring/recompute-profile";

export const maxDuration = 60;

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

  // Inline processing — parse the in-memory buffer directly so we don't need
  // to re-fetch the (private) blob and don't rely on fire-and-forget background
  // fetches which Vercel serverless functions kill at request end.
  let defectCount = 0;
  try {
    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: { status: "PROCESSING", stage: "EXTRACTING", startedAt: new Date(), attempts: 1 },
    });

    const text = buffer.toString("utf8");
    const raws = parseSections(text);
    const normalized = dedupeDefects(mapRawFindings(raws));

    if (normalized.length > 0) {
      await prisma.$transaction(
        normalized.map((d) =>
          prisma.defect.create({
            data: {
              propertyId,
              inspectionId: inspection.id,
              category: d.category,
              system: d.system,
              component: d.component,
              title: d.title,
              description: d.description,
              severity: d.severity,
              urgency: d.urgency,
              lifecycleStage: d.lifecycleStage,
              estimatedCostLow: d.estimatedCostLow,
              estimatedCostHigh: d.estimatedCostHigh,
              confidenceScore: d.confidenceScore,
              sourceKind: d.sourceKind,
              normalizedHash: d.normalizedHash,
            },
          })
        )
      );
    }

    await prisma.inspection.update({
      where: { id: inspection.id },
      data: { extractedTextStatus: "DONE", normalizationStatus: "DONE" },
    });

    await recomputePropertyConditionProfile(propertyId);

    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: { status: "DONE", stage: "DONE", finishedAt: new Date() },
    });

    defectCount = normalized.length;
  } catch (ingestErr) {
    logger.error("inline-ingestion-failed", { jobId: job.id, err: String(ingestErr) });
    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: String(ingestErr), finishedAt: new Date() },
    });
  }

    return NextResponse.json({
      uploadUrl: blob.url,
      jobId: job.id,
      inspectionId: inspection.id,
      defectCount,
    });
  } catch (err) {
    logger.error("upload-failed", { err: String(err), stack: err instanceof Error ? err.stack : undefined });
    return NextResponse.json(
      { error: { code: "UPLOAD_FAILED", message: String(err) } },
      { status: 500 }
    );
  }
}
