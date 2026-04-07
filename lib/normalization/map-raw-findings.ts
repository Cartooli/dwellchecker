import type { RawFinding } from "@/types/api";
import { createHash } from "node:crypto";

export type NormalizedDefect = {
  category: string;
  system: string | null;
  component: string | null;
  title: string;
  description: string;
  severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  urgency: "MONITOR" | "PLAN" | "SOON" | "IMMEDIATE";
  lifecycleStage: string | null;
  estimatedCostLow: number | null;
  estimatedCostHigh: number | null;
  confidenceScore: number;
  sourceKind: "INSPECTION_UPLOAD" | "INFERRED" | "MANUAL_REVIEW";
  normalizedHash: string;
};

const CATEGORY_RULES: Array<{
  match: RegExp;
  category: string;
  system: string;
  component: string;
  title: string;
  costLow: number;
  costHigh: number;
}> = [
  {
    match: /roof|shingle|flashing/i,
    category: "roof",
    system: "exterior_envelope",
    component: "roof_covering",
    title: "Roof covering wear",
    costLow: 8000,
    costHigh: 22000,
  },
  {
    match: /foundation|crack|settling|slab/i,
    category: "foundation",
    system: "structure",
    component: "foundation",
    title: "Foundation concern",
    costLow: 5000,
    costHigh: 35000,
  },
  {
    match: /electric|panel|wiring|breaker|knob[- ]and[- ]tube|aluminum wir/i,
    category: "electrical",
    system: "electrical",
    component: "service_panel",
    title: "Electrical safety concern",
    costLow: 1500,
    costHigh: 9000,
  },
  {
    match: /hvac|furnace|boiler|heat pump|air conditioner|ac\b/i,
    category: "hvac",
    system: "mechanical",
    component: "hvac_unit",
    title: "HVAC end-of-life or defect",
    costLow: 4000,
    costHigh: 14000,
  },
  {
    match: /plumb|leak|water heater|drain|sewer/i,
    category: "plumbing",
    system: "plumbing",
    component: "supply_or_drain",
    title: "Plumbing issue",
    costLow: 800,
    costHigh: 9000,
  },
  {
    match: /window|door|seal|fog/i,
    category: "windows",
    system: "exterior_envelope",
    component: "windows",
    title: "Window or seal issue",
    costLow: 600,
    costHigh: 8000,
  },
  {
    match: /mold|moisture|water intrusion|damp/i,
    category: "moisture",
    system: "interior",
    component: "moisture",
    title: "Moisture / mold concern",
    costLow: 1000,
    costHigh: 12000,
  },
];

function severityFor(text: string): NormalizedDefect["severity"] {
  if (/critical|hazard|unsafe|imminent|fire risk/i.test(text)) return "CRITICAL";
  if (/significant|major|replace|end[- ]of[- ]life|leaking actively/i.test(text)) return "HIGH";
  if (/recommend|monitor closely|moderate|aging/i.test(text)) return "MODERATE";
  return "LOW";
}

function urgencyFor(sev: NormalizedDefect["severity"]): NormalizedDefect["urgency"] {
  switch (sev) {
    case "CRITICAL":
      return "IMMEDIATE";
    case "HIGH":
      return "SOON";
    case "MODERATE":
      return "PLAN";
    default:
      return "MONITOR";
  }
}

function hash(parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex");
}

export function mapRawFindings(findings: RawFinding[]): NormalizedDefect[] {
  const out: NormalizedDefect[] = [];
  for (const f of findings) {
    // Match ALL rules against each finding so a single text blob (e.g., a PDF
    // extracted as one page) can produce multiple categorized defects.
    for (const rule of CATEGORY_RULES) {
      if (!rule.match.test(f.rawText)) continue;
      const context = sliceAroundMatch(f.rawText, rule.match);
      const severity = severityFor(context);
      out.push({
        category: rule.category,
        system: rule.system,
        component: rule.component,
        title: rule.title,
        description: context.slice(0, 500),
        severity,
        urgency: urgencyFor(severity),
        lifecycleStage:
          severity === "HIGH" || severity === "CRITICAL" ? "end_of_life" : "in_service",
        estimatedCostLow: rule.costLow,
        estimatedCostHigh: rule.costHigh,
        confidenceScore: 0.7,
        sourceKind: "INSPECTION_UPLOAD",
        normalizedHash: hash([rule.category, rule.component, severity]),
      });
    }
  }
  return out;
}

function sliceAroundMatch(text: string, re: RegExp): string {
  const m = text.match(re);
  if (!m || m.index == null) return text.trim();
  const start = Math.max(0, m.index - 80);
  const end = Math.min(text.length, m.index + 220);
  return text.slice(start, end).trim();
}
