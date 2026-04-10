import { prisma } from "@/lib/db/client";
import { parseSections } from "./parse-sections";
import { mapRawFindings } from "@/lib/normalization/map-raw-findings";
import { dedupeDefects } from "@/lib/normalization/dedupe-defects";
import { recomputePropertyConditionProfile } from "@/lib/scoring/recompute-profile";

/**
 * Shared pipeline: parse extracted text → normalize → dedupe → persist defects
 * → update inspection status → recompute property profile.
 *
 * Returns the number of defects persisted.
 */
export async function runNormalizationPipeline(params: {
  text: string;
  propertyId: string;
  inspectionId: string;
}): Promise<number> {
  const { text, propertyId, inspectionId } = params;

  const raws = parseSections(text);
  const normalized = dedupeDefects(mapRawFindings(raws));

  if (normalized.length > 0) {
    await prisma.$transaction(
      normalized.map((d) =>
        prisma.defect.create({
          data: {
            propertyId,
            inspectionId,
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
    where: { id: inspectionId },
    data: { extractedTextStatus: "DONE", normalizationStatus: "DONE" },
  });

  await recomputePropertyConditionProfile(propertyId);

  return normalized.length;
}
