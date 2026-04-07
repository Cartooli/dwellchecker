import type { NormalizedDefect } from "@/lib/normalization/map-raw-findings";

export type DecisionResult = {
  score: number;
  recommendation:
    | "PROCEED"
    | "PROCEED_WITH_CONDITIONS"
    | "NEGOTIATE"
    | "WALK"
    | "INSUFFICIENT_DATA";
  confidence: number;
  topRiskTitles: string[];
  capitalExposureLow: number;
  capitalExposureHigh: number;
  summary: string;
};

const SEV_PENALTY = { LOW: 2, MODERATE: 6, HIGH: 14, CRITICAL: 25 } as const;

export function decide(defects: NormalizedDefect[]): DecisionResult {
  if (defects.length === 0) {
    return {
      score: 0,
      recommendation: "INSUFFICIENT_DATA",
      confidence: 0.2,
      topRiskTitles: [],
      capitalExposureLow: 0,
      capitalExposureHigh: 0,
      summary: "No inspection data yet. Upload a report to generate a recommendation.",
    };
  }

  const penalty = defects.reduce((acc, d) => acc + SEV_PENALTY[d.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  const critical = defects.filter((d) => d.severity === "CRITICAL").length;
  const high = defects.filter((d) => d.severity === "HIGH").length;

  let recommendation: DecisionResult["recommendation"];
  if (critical >= 1) recommendation = "WALK";
  else if (high >= 3) recommendation = "NEGOTIATE";
  else if (high >= 1) recommendation = "PROCEED_WITH_CONDITIONS";
  else recommendation = "PROCEED";

  const top = [...defects]
    .sort((a, b) => SEV_PENALTY[b.severity] - SEV_PENALTY[a.severity])
    .slice(0, 5)
    .map((d) => d.title);

  const capLow = defects.reduce((s, d) => s + (d.estimatedCostLow ?? 0), 0);
  const capHigh = defects.reduce((s, d) => s + (d.estimatedCostHigh ?? 0), 0);

  const avgConfidence =
    defects.reduce((s, d) => s + d.confidenceScore, 0) / defects.length;

  return {
    score,
    recommendation,
    confidence: Number(avgConfidence.toFixed(2)),
    topRiskTitles: top,
    capitalExposureLow: capLow,
    capitalExposureHigh: capHigh,
    summary: buildSummary(recommendation, top, capLow, capHigh),
  };
}

function buildSummary(
  rec: DecisionResult["recommendation"],
  top: string[],
  low: number,
  high: number
): string {
  const cap =
    low || high ? ` Estimated near-term capital exposure: $${low.toLocaleString()}–$${high.toLocaleString()}.` : "";
  const lead = top.length ? ` Leading concerns: ${top.slice(0, 3).join("; ")}.` : "";
  switch (rec) {
    case "WALK":
      return `Significant safety or structural risks detected.${lead}${cap}`;
    case "NEGOTIATE":
      return `Multiple high-severity findings warrant credits or repairs.${lead}${cap}`;
    case "PROCEED_WITH_CONDITIONS":
      return `Property is acceptable with targeted follow-up.${lead}${cap}`;
    case "PROCEED":
      return `No major risks identified.${lead}${cap}`;
    default:
      return "Insufficient data for a recommendation.";
  }
}
