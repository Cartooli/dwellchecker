import { prisma } from "@/lib/db/client";
import { decide } from "./decision";
import type { NormalizedDefect } from "@/lib/normalization/map-raw-findings";

export async function recomputePropertyConditionProfile(propertyId: string) {
  const defects = await prisma.defect.findMany({ where: { propertyId } });
  const normalized: NormalizedDefect[] = defects.map((d) => ({
    category: d.category,
    system: d.system,
    component: d.component,
    title: d.title,
    description: d.description,
    severity: d.severity,
    urgency: d.urgency ?? "MONITOR",
    lifecycleStage: d.lifecycleStage,
    estimatedCostLow: d.estimatedCostLow,
    estimatedCostHigh: d.estimatedCostHigh,
    confidenceScore: d.confidenceScore ?? 0.5,
    sourceKind: (d.sourceKind as NormalizedDefect["sourceKind"]) ?? "INSPECTION_UPLOAD",
    normalizedHash: d.normalizedHash ?? "",
  }));

  const result = decide(normalized);

  const profile = await prisma.propertyConditionProfile.findFirst({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
  });

  const data = {
    propertyId,
    currentScore: result.score,
    recommendation: result.recommendation,
    recommendationConfidence: result.confidence,
    summaryJson: result as unknown as object,
    lastRecomputedAt: new Date(),
  };

  if (profile) {
    return prisma.propertyConditionProfile.update({ where: { id: profile.id }, data });
  }
  return prisma.propertyConditionProfile.create({ data });
}
