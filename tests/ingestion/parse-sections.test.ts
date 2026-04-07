import { describe, it, expect } from "vitest";
import { parseSections } from "@/lib/ingestion/parse-sections";

describe("parseSections", () => {
  it("returns empty array for empty input", () => {
    expect(parseSections("")).toEqual([]);
  });

  it("splits multi-line text into findings", () => {
    const text =
      "ROOF: asphalt shingles worn and at end of life.\nELECTRICAL: panel is unsafe and must be replaced immediately.";
    const out = parseSections(text);
    expect(out).toHaveLength(2);
  });

  it("filters out lines under 20 characters", () => {
    const text = "ok\nshort\nthis is a long enough line with actual content to keep";
    const out = parseSections(text);
    expect(out).toHaveLength(1);
  });

  it("preserves punctuation and casing in the rawText", () => {
    const text = "ROOF: Asphalt shingles are at end of life. Replace within 1-2 years.";
    const out = parseSections(text);
    expect(out[0]!.rawText).toContain("ROOF:");
    expect(out[0]!.rawText).toContain("1-2 years");
  });
});
