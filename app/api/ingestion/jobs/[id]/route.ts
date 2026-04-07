import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = await prisma.ingestionJob.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Job not found" } }, { status: 404 });
  }
  return NextResponse.json({ jobId: job.id, status: job.status, stage: job.stage });
}
