import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { env } from "@/lib/env";
import { extractText } from "@/lib/ingestion/extract-text";
import { parseSections } from "@/lib/ingestion/parse-sections";
import { mapRawFindings } from "@/lib/normalization/map-raw-findings";
import { dedupeDefects } from "@/lib/normalization/dedupe-defects";
import { recomputePropertyConditionProfile } from "@/lib/scoring/recompute-profile";
import { logger } from "@/lib/logging/logger";

export const maxDuration = 60;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== env.INTERNAL_JOB_SECRET) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Bad secret" } }, { status: 401 });
  }

  const { id } = await ctx.params;
  const job = await prisma.ingestionJob.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Job not found" } }, { status: 404 });
  if (!job.fileUrl || !job.inspectionId) {
    return NextResponse.json({ error: { code: "INVALID_JOB", message: "Job missing file or inspection" } }, { status: 400 });
  }

  await prisma.ingestionJob.update({
    where: { id: job.id },
    data: { status: "PROCESSING", stage: "EXTRACTING", startedAt: new Date(), attempts: { increment: 1 } },
  });

  try {
    const text = await extractText(job.fileUrl);

    await prisma.ingestionJob.update({ where: { id: job.id }, data: { stage: "PARSING" } });
    const raws = parseSections(text);

    await prisma.ingestionJob.update({ where: { id: job.id }, data: { stage: "NORMALIZING" } });
    const normalized = dedupeDefects(mapRawFindings(raws));

    await prisma.$transaction(
      normalized.map((d) =>
        prisma.defect.create({
          data: {
            propertyId: job.propertyId,
            inspectionId: job.inspectionId,
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

    await prisma.inspection.update({
      where: { id: job.inspectionId },
      data: { extractedTextStatus: "DONE", normalizationStatus: "DONE" },
    });

    await recomputePropertyConditionProfile(job.propertyId);

    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: { status: "DONE", stage: "DONE", finishedAt: new Date() },
    });

    await prisma.auditEvent.create({
      data: {
        propertyId: job.propertyId,
        inspectionId: job.inspectionId,
        actorType: "SYSTEM",
        eventType: "INGESTION_COMPLETE",
        payloadJson: { jobId: job.id, defectCount: normalized.length },
      },
    });

    return NextResponse.json({ jobId: job.id, status: "DONE", defects: normalized.length });
  } catch (err) {
    logger.error("ingestion-failed", { jobId: job.id, err: String(err) });
    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: String(err), finishedAt: new Date() },
    });
    return NextResponse.json({ error: { code: "INGESTION_FAILED", message: String(err) } }, { status: 500 });
  }
}
