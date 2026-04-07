import { describe, it, expect } from "vitest";
import { dedupeDefects } from "@/lib/normalization/dedupe-defects";
import type { NormalizedDefect } from "@/lib/normalization/map-raw-findings";

function defect(overrides: Partial<NormalizedDefect>): NormalizedDefect {
  return {
    category: "roof",
    system: "exterior_envelope",
    component: "roof_covering",
    title: "Roof covering wear",
    description: "desc",
    severity: "MODERATE",
    urgency: "PLAN",
    lifecycleStage: "in_service",
    estimatedCostLow: 8000,
    estimatedCostHigh: 12000,
    confidenceScore: 0.7,
    sourceKind: "INSPECTION_UPLOAD",
    normalizedHash: "irrelevant-we-dedupe-by-category-component",
    ...overrides,
  };
}

describe("dedupeDefects", () => {
  it("returns the single defect unchanged when no duplicates", () => {
    const result = dedupeDefects([defect({})]);
    expect(result).toHaveLength(1);
    expect(result[0]!.estimatedCostLow).toBe(8000);
    expect(result[0]!.estimatedCostHigh).toBe(12000);
  });

  it("collapses two defects with same (category, component) into one", () => {
    const result = dedupeDefects([
      defect({ severity: "MODERATE", estimatedCostLow: 8000, estimatedCostHigh: 12000 }),
      defect({ severity: "HIGH", estimatedCostLow: 9000, estimatedCostHigh: 18000 }),
    ]);
    expect(result).toHaveLength(1);
  });

  it("keeps the highest severity when collapsing", () => {
    const result = dedupeDefects([
      defect({ severity: "MODERATE" }),
      defect({ severity: "HIGH" }),
      defect({ severity: "LOW" }),
    ]);
    expect(result[0]!.severity).toBe("HIGH");
  });

  it("reconciles costs as min(low) / max(high), not sum", () => {
    const result = dedupeDefects([
      defect({ estimatedCostLow: 8000, estimatedCostHigh: 12000 }),
      defect({ estimatedCostLow: 9000, estimatedCostHigh: 18000 }),
    ]);
    expect(result[0]!.estimatedCostLow).toBe(8000); // min
    expect(result[0]!.estimatedCostHigh).toBe(18000); // max
    // explicitly NOT the sum
    expect(result[0]!.estimatedCostLow).not.toBe(17000);
    expect(result[0]!.estimatedCostHigh).not.toBe(30000);
  });

  it("preserves the longest description", () => {
    const result = dedupeDefects([
      defect({ description: "short" }),
      defect({
        description:
          "this is a much longer description with more context about the roof covering issue observed during inspection",
      }),
    ]);
    expect(result[0]!.description.length).toBeGreaterThan(50);
  });

  it("keeps defects with different components separate", () => {
    const result = dedupeDefects([
      defect({ category: "electrical", component: "service_panel" }),
      defect({ category: "electrical", component: "wiring" }),
    ]);
    expect(result).toHaveLength(2);
  });
});
