import { NextResponse } from "next/server";
import { recomputePropertyConditionProfile } from "@/lib/scoring/recompute-profile";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const profile = await recomputePropertyConditionProfile(id);
  return NextResponse.json({
    propertyId: id,
    score: profile.currentScore,
    recommendation: profile.recommendation,
    confidence: profile.recommendationConfidence,
  });
}
