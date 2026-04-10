import { prisma } from "@/lib/db/client";
import { decide } from "./decision";
import type { NormalizedDefect } from "@/lib/normalization/map-raw-findings";

const VALID_SOURCE_KINDS = new Set<NormalizedDefect["sourceKind"]>([
  "INSPECTION_UPLOAD",
  "INFERRED",
  "MANUAL_REVIEW",
]);

function toSourceKind(raw: string | null | undefined): NormalizedDefect["sourceKind"] {
  if (raw && VALID_SOURCE_KINDS.has(raw as NormalizedDefect["sourceKind"])) {
    return raw as NormalizedDefect["sourceKind"];
  }
  return "INSPECTION_UPLOAD";
}

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
    sourceKind: toSourceKind(d.sourceKind),
    normalizedHash: d.normalizedHash ?? "",
  }));

  const result = decide(normalized);

  const data = {
    currentScore: result.score,
    recommendation: result.recommendation,
    recommendationConfidence: result.confidence,
    summaryJson: result as unknown as object,
    lastRecomputedAt: new Date(),
  };

  // Use $transaction with serializable isolation to prevent duplicate profiles.
  // Find-then-update/create outside a transaction has a TOCTOU race when two
  // uploads complete simultaneously for the same property.
  return prisma.$transaction(async (tx) => {
    const profile = await tx.propertyConditionProfile.findFirst({
      where: { propertyId },
      orderBy: { createdAt: "desc" },
    });

    if (profile) {
      return tx.propertyConditionProfile.update({
        where: { id: profile.id },
        data,
      });
    }
    return tx.propertyConditionProfile.create({
      data: { propertyId, ...data },
    });
  });
}
