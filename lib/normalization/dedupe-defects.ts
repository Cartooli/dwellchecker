import type { NormalizedDefect } from "./map-raw-findings";

export function dedupeDefects(defects: NormalizedDefect[]): NormalizedDefect[] {
  const map = new Map<string, NormalizedDefect>();
  for (const d of defects) {
    const existing = map.get(d.normalizedHash);
    if (!existing) {
      map.set(d.normalizedHash, d);
      continue;
    }
    // Keep highest severity / longest description
    const sevRank = { LOW: 0, MODERATE: 1, HIGH: 2, CRITICAL: 3 } as const;
    if (sevRank[d.severity] > sevRank[existing.severity]) {
      map.set(d.normalizedHash, { ...d, description: longer(existing.description, d.description) });
    } else {
      existing.description = longer(existing.description, d.description);
    }
  }
  return Array.from(map.values());
}

function longer(a: string, b: string) {
  return a.length >= b.length ? a : b;
}
