import { describe, it, expect } from "vitest";
import { parseSections } from "@/lib/ingestion/parse-sections";
import { mapRawFindings } from "@/lib/normalization/map-raw-findings";
import { dedupeDefects } from "@/lib/normalization/dedupe-defects";
import { decide } from "@/lib/scoring/decision";

describe("integration: upload pipeline cost math (regression for cost double-count)", () => {
  it("a report mentioning the same category at two severities yields ONE defect, not two, with a min/max cost range", () => {
    // Two separate mentions of roof in the same report: moderate then high.
    // Before the fix these produced two defects and decide() summed their costs.
    // After the fix: one defect, costs reconciled as min(low)/max(high).
    const text = [
      "ROOF: The asphalt shingles show moderate wear and aging after years of exposure.",
      "",
      "ROOF: Advanced wear and end of life condition, recommend replacement soon.",
    ].join("\n");

    const findings = parseSections(text);
    const normalized = mapRawFindings(findings);
    const deduped = dedupeDefects(normalized);

    // Should collapse to exactly one roof defect
    const roofDefects = deduped.filter((d) => d.category === "roof");
    expect(roofDefects).toHaveLength(1);

    // Highest severity survives
    expect(roofDefects[0]!.severity).toBe("HIGH");

    // The roof rule has costLow 8000, costHigh 22000. Both mentions hit the same rule
    // so the costs are identical — min/max gives us the same range as either input.
    expect(roofDefects[0]!.estimatedCostLow).toBe(8000);
    expect(roofDefects[0]!.estimatedCostHigh).toBe(22000);

    // decide() should NOT double-count
    const result = decide(deduped);
    expect(result.capitalExposureLow).toBe(8000);
    expect(result.capitalExposureHigh).toBe(22000);
    // explicitly not the double-counted amounts
    expect(result.capitalExposureLow).not.toBe(16000);
    expect(result.capitalExposureHigh).not.toBe(44000);
  });

  it("a report with multiple distinct categories keeps them all", () => {
    const text = [
      "ROOF: shingles worn, needs replacement.",
      "ELECTRICAL: Federal Pacific panel unsafe, replace immediately.",
      "PLUMBING: active leak under kitchen sink.",
    ].join("\n");

    const findings = parseSections(text);
    const normalized = mapRawFindings(findings);
    const deduped = dedupeDefects(normalized);

    const categories = new Set(deduped.map((d) => d.category));
    expect(categories.has("roof")).toBe(true);
    expect(categories.has("electrical")).toBe(true);
    expect(categories.has("plumbing")).toBe(true);
  });
});
