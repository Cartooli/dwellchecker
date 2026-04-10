import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { env } from "@/lib/env";
import { extractText } from "@/lib/ingestion/extract-text";
import { runNormalizationPipeline } from "@/lib/ingestion/process-pipeline";
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

    await prisma.ingestionJob.update({ where: { id: job.id }, data: { stage: "NORMALIZING" } });

    const defectCount = await runNormalizationPipeline({
      text,
      propertyId: job.propertyId,
      inspectionId: job.inspectionId,
    });

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
        payloadJson: { jobId: job.id, defectCount },
      },
    });

    return NextResponse.json({ jobId: job.id, status: "DONE", defects: defectCount });
  } catch (err) {
    const safeMsg = err instanceof Error ? err.message.slice(0, 200) : "An unexpected error occurred.";
    logger.error("ingestion-failed", { jobId: job.id, err: safeMsg, stack: err instanceof Error ? err.stack : undefined });
    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: safeMsg, finishedAt: new Date() },
    });
    return NextResponse.json({ error: { code: "INGESTION_FAILED", message: "Ingestion failed. Check job status for details." } }, { status: 500 });
  }
}
