import { describe, it, expect } from "vitest";
import { mapRawFindings } from "@/lib/normalization/map-raw-findings";

describe("mapRawFindings", () => {
  it("returns empty array when no rules match", () => {
    const out = mapRawFindings([{ rawText: "the kitchen has nice tile and great lighting" }]);
    expect(out).toEqual([]);
  });

  it("matches a single category rule", () => {
    const out = mapRawFindings([
      { rawText: "The roof shingles are worn and at end of life, recommend replacement soon." },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.category).toBe("roof");
    expect(out[0]!.severity).toBe("HIGH");
  });

  it("matches multiple category rules in one finding (multi-rule fix)", () => {
    const text =
      "ROOF: shingles worn, needs replacement. ELECTRICAL: Federal Pacific panel is a safety hazard. PLUMBING: active leak under sink.";
    const out = mapRawFindings([{ rawText: text }]);
    const categories = out.map((d) => d.category).sort();
    expect(categories).toContain("roof");
    expect(categories).toContain("electrical");
    expect(categories).toContain("plumbing");
  });

  it("escalates severity when critical language is present", () => {
    const out = mapRawFindings([
      { rawText: "Federal Pacific panel is an unsafe fire risk and must be replaced." },
    ]);
    expect(out[0]!.severity).toBe("CRITICAL");
    expect(out[0]!.urgency).toBe("IMMEDIATE");
  });

  it("sets LOW severity for benign mentions", () => {
    const out = mapRawFindings([{ rawText: "Electrical outlets in the garage are GFCI rated." }]);
    expect(out[0]!.severity).toBe("LOW");
  });
});
