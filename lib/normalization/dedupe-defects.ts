import type { NormalizedDefect } from "./map-raw-findings";

const SEV_RANK = { LOW: 0, MODERATE: 1, HIGH: 2, CRITICAL: 3 } as const;
const URGENCY_RANK = { MONITOR: 0, PLAN: 1, SOON: 2, IMMEDIATE: 3 } as const;

export function dedupeDefects(defects: NormalizedDefect[]): NormalizedDefect[] {
  const map = new Map<string, NormalizedDefect>();

  for (const d of defects) {
    const key = `${d.category}::${d.component ?? ""}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...d });
      continue;
    }

    // Merge into existing — keep highest severity/urgency, reconcile costs as
    // min(low)/max(high) (not sum), keep the longest description.
    if (SEV_RANK[d.severity] > SEV_RANK[existing.severity]) {
      existing.severity = d.severity;
      existing.title = d.title;
      existing.lifecycleStage = d.lifecycleStage;
    }
    if (URGENCY_RANK[d.urgency] > URGENCY_RANK[existing.urgency]) {
      existing.urgency = d.urgency;
    }
    if (d.estimatedCostLow != null && existing.estimatedCostLow != null) {
      existing.estimatedCostLow = Math.min(existing.estimatedCostLow, d.estimatedCostLow);
    } else if (d.estimatedCostLow != null) {
      existing.estimatedCostLow = d.estimatedCostLow;
    }
    if (d.estimatedCostHigh != null && existing.estimatedCostHigh != null) {
      existing.estimatedCostHigh = Math.max(existing.estimatedCostHigh, d.estimatedCostHigh);
    } else if (d.estimatedCostHigh != null) {
      existing.estimatedCostHigh = d.estimatedCostHigh;
    }
    if ((d.description ?? "").length > (existing.description ?? "").length) {
      existing.description = d.description;
    }
    if (d.confidenceScore > existing.confidenceScore) {
      existing.confidenceScore = d.confidenceScore;
    }
  }

  return Array.from(map.values());
}
