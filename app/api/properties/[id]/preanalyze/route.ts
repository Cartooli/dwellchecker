import { auth } from "@/lib/auth/session";
import { NextResponse } from "next/server";
import { recomputePropertyConditionProfile } from "@/lib/scoring/recompute-profile";
import { userCanWriteProperty } from "@/lib/auth/property-access";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  if (!(await userCanWriteProperty(userId, id))) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
  }

  const profile = await recomputePropertyConditionProfile(id);
  return NextResponse.json({
    propertyId: id,
    score: profile.currentScore,
    recommendation: profile.recommendation,
    confidence: profile.recommendationConfidence,
  });
}
