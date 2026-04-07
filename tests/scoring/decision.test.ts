import { describe, it, expect } from "vitest";
import { decide } from "@/lib/scoring/decision";
import type { NormalizedDefect } from "@/lib/normalization/map-raw-findings";

function d(overrides: Partial<NormalizedDefect>): NormalizedDefect {
  return {
    category: "roof",
    system: "exterior_envelope",
    component: "roof_covering",
    title: "Roof wear",
    description: "desc",
    severity: "MODERATE",
    urgency: "PLAN",
    lifecycleStage: "in_service",
    estimatedCostLow: 1000,
    estimatedCostHigh: 2000,
    confidenceScore: 0.7,
    sourceKind: "INSPECTION_UPLOAD",
    normalizedHash: "h",
    ...overrides,
  };
}

describe("decide", () => {
  it("returns INSUFFICIENT_DATA with zero defects", () => {
    const r = decide([]);
    expect(r.recommendation).toBe("INSUFFICIENT_DATA");
    expect(r.score).toBe(0);
    expect(r.capitalExposureLow).toBe(0);
    expect(r.capitalExposureHigh).toBe(0);
  });

  it("returns WALK with one CRITICAL defect", () => {
    const r = decide([d({ severity: "CRITICAL", category: "electrical" })]);
    expect(r.recommendation).toBe("WALK");
  });

  it("returns NEGOTIATE with three HIGH defects", () => {
    const r = decide([
      d({ severity: "HIGH", category: "roof" }),
      d({ severity: "HIGH", category: "plumbing" }),
      d({ severity: "HIGH", category: "hvac" }),
    ]);
    expect(r.recommendation).toBe("NEGOTIATE");
  });

  it("returns PROCEED_WITH_CONDITIONS with one HIGH defect", () => {
    const r = decide([d({ severity: "HIGH" })]);
    expect(r.recommendation).toBe("PROCEED_WITH_CONDITIONS");
  });

  it("returns PROCEED with only LOW and MODERATE defects", () => {
    const r = decide([d({ severity: "LOW" }), d({ severity: "MODERATE" })]);
    expect(r.recommendation).toBe("PROCEED");
  });

  it("sums capital exposure across defects", () => {
    const r = decide([
      d({ estimatedCostLow: 1000, estimatedCostHigh: 3000 }),
      d({ estimatedCostLow: 2000, estimatedCostHigh: 5000, component: "other" }),
    ]);
    expect(r.capitalExposureLow).toBe(3000);
    expect(r.capitalExposureHigh).toBe(8000);
  });

  it("caps score at 100 and floors at 0", () => {
    const r = decide([
      d({ severity: "CRITICAL" }),
      d({ severity: "CRITICAL" }),
      d({ severity: "CRITICAL" }),
      d({ severity: "CRITICAL" }),
      d({ severity: "CRITICAL" }),
    ]);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
