import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { userCanReadProperty } from "@/lib/auth/property-access";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const job = await prisma.ingestionJob.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Job not found" } }, { status: 404 });
  }
  if (!(await userCanReadProperty(userId, job.propertyId))) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Job not found" } }, { status: 404 });
  }
  return NextResponse.json({ jobId: job.id, status: job.status, stage: job.stage });
}
