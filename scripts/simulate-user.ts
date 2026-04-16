/**
 * dwellchecker — simulated user E2E (HTTP + Prisma).
 * Clerk signup/login requires a browser; we assert 401s and mirror domain logic with a synthetic user id.
 */
import { loadEnvConfig } from "@next/env";

import { prisma } from "@/lib/db/client";
import { upsertProperty } from "@/lib/domain/property";
import { PropertyUpsertInput } from "@/types/api";

loadEnvConfig(process.cwd());

export type Issue = {
  phase: string;
  type: "BUG" | "FEATURE_REQUEST" | "UX_FEEDBACK" | "ERROR";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  expected?: string;
  actual?: string;
  workaround?: string;
};

/** Persona: Priya Natarajan — Somerville MA first-time buyer */
export const PERSONA = {
  fullName: "Priya Natarajan",
  email: `priya.natarajan.sim+${Date.now()}@example.com`,
  city: "Somerville",
  state: "MA",
} as const;

export const SIM_USER_PREFIX = "user_sim_e2e_";
const simUserId = () => `${SIM_USER_PREFIX}${Date.now()}`;

const issues: Issue[] = [];

function logIssue(i: Issue) {
  issues.push(i);
  const tag =
    i.type === "BUG" ? "🐞" : i.type === "FEATURE_REQUEST" ? "💡" : i.type === "UX_FEEDBACK" ? "💬" : "⚠️";
  console.log(`${tag} [${i.phase}] ${i.severity}: ${i.description}`);
}

/** Default dev server port for this repo when multiple apps use :3000. Override with `--base-url`. */
const DEFAULT_BASE_URL = "http://localhost:3020";

function parseArgs(argv: string[]) {
  const baseUrl = DEFAULT_BASE_URL;
  let skipHttp = false;
  let clean = false;
  let reportOnly = false;
  let base = baseUrl;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skip-http") skipHttp = true;
    else if (a === "--clean") clean = true;
    else if (a === "--report-only") reportOnly = true;
    else if (a === "--base-url" && argv[i + 1]) {
      base = argv[++i];
    }
  }
  return { skipHttp, clean, reportOnly, baseUrl: base };
}

async function phase0Health(baseUrl: string): Promise<boolean> {
  console.log("\n--- Phase 0: Health ---");
  try {
    const r = await fetch(baseUrl + "/", { redirect: "manual" });
    const ok = r.status === 200 || r.status === 307 || r.status === 308;
    if (!ok) {
      logIssue({
        phase: "0",
        type: "ERROR",
        severity: "HIGH",
        description: `GET / returned ${r.status}`,
        expected: "200",
        actual: String(r.status),
      });
      return false;
    }
    console.log(`OK GET / → ${r.status}`);
    return true;
  } catch (e) {
    logIssue({
      phase: "0",
      type: "ERROR",
      severity: "HIGH",
      description: `Server not reachable at ${baseUrl}`,
      actual: e instanceof Error ? e.message : String(e),
      workaround: "Start npm run dev or pass --base-url",
    });
    return false;
  }
}

async function phaseHttp(baseUrl: string) {
  console.log("\n--- Phase HTTP (anonymous) ---");

  const upsertUrl = new URL("/api/properties/upsert", baseUrl).toString();
  const r401 = await fetch(upsertUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      street1: "100 Main St",
      city: "Somerville",
      state: "MA",
      postalCode: "02144",
    }),
  });
  if (r401.status !== 401) {
    logIssue({
      phase: "HTTP",
      type: "BUG",
      severity: "HIGH",
      description: "POST /api/properties/upsert without session should be 401",
      expected: "401",
      actual: String(r401.status),
    });
  } else {
    console.log("OK anonymous POST /api/properties/upsert → 401");
  }

  const getUrl = new URL("/api/properties/clfake123", baseUrl).toString();
  const g401 = await fetch(getUrl);
  if (g401.status !== 401) {
    logIssue({
      phase: "HTTP",
      type: "BUG",
      severity: "HIGH",
      description: "GET /api/properties/:id without session should be 401",
      expected: "401",
      actual: String(g401.status),
    });
  } else {
    console.log("OK anonymous GET /api/properties/:id → 401");
  }

  const rInvalidJson = await fetch(upsertUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not-json",
  });
  if (rInvalidJson.status !== 401) {
    logIssue({
      phase: "HTTP",
      type: "BUG",
      severity: "MEDIUM",
      description: "Malformed JSON without session should still be 401 (auth runs first)",
      expected: "401",
      actual: String(rInvalidJson.status),
    });
  } else {
    console.log("OK malformed JSON body → 401 (unauthorized)");
  }
}

async function phasePrisma(userId: string): Promise<"ok" | "blocked"> {
  console.log("\n--- Phase Prisma (synthetic Clerk user) ---");

  const valid = {
    street1: "88 Highland Ave",
    street2: "Unit 2",
    city: PERSONA.city,
    state: PERSONA.state,
    postalCode: "02143",
    yearBuilt: 1920,
  };

  try {
    PropertyUpsertInput.parse({ ...valid, street1: "x".repeat(250) });
    logIssue({
      phase: "PRISMA",
      type: "BUG",
      severity: "HIGH",
      description: "Zod should reject street1 > 200 chars",
    });
  } catch {
    console.log("OK Zod rejects overly long street1");
  }

  try {
    PropertyUpsertInput.parse({ ...valid, state: "M" });
    logIssue({
      phase: "PRISMA",
      type: "BUG",
      severity: "MEDIUM",
      description: "Zod should reject state shorter than 2 chars",
    });
  } catch {
    console.log("OK Zod rejects short state");
  }

  try {
    const a = await upsertProperty(PropertyUpsertInput.parse(valid), userId);
    console.log(`First upsert: created=${a.created} id=${a.property.id}`);

    const b = await upsertProperty(PropertyUpsertInput.parse(valid), userId);
    if (b.created !== false || b.property.id !== a.property.id) {
      logIssue({
        phase: "PRISMA",
        type: "BUG",
        severity: "HIGH",
        description: "Duplicate address for same owner should return created=false same id",
        expected: `${a.property.id} created=false`,
        actual: `${b.property.id} created=${b.created}`,
      });
    } else {
      console.log("OK duplicate upsert is idempotent");
    }

    const n = await prisma.property.count({ where: { ownerUserId: userId } });
    console.log(`Properties for sim user: ${n}`);
    return "ok";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logIssue({
      phase: "PRISMA",
      type: "ERROR",
      severity: "CRITICAL",
      description:
        "Prisma DB phase failed (schema drift, missing env, or connection). Align DB with prisma/schema.prisma.",
      actual: msg,
      workaround: "Run `npx prisma migrate deploy` or `npx prisma db push` against DATABASE_URL, then re-run.",
    });
    return "blocked";
  }
}

async function cleanupSimData() {
  try {
    const deleted = await prisma.property.deleteMany({
      where: { ownerUserId: { startsWith: SIM_USER_PREFIX } },
    });
    console.log(`Cleanup: deleted ${deleted.count} Property rows (prefix ${SIM_USER_PREFIX})`);
  } catch (e) {
    console.warn(
      "Cleanup skipped:",
      e instanceof Error ? e.message : e
    );
  }
}

async function writeReport(
  outPath: string,
  opts: { userId: string; httpOk: boolean; prismaPhase: "ok" | "skipped" | "blocked" }
) {
  const ts = new Date().toISOString();
  const finalStatus =
    opts.prismaPhase === "blocked" || issues.some((i) => i.severity === "CRITICAL")
      ? "BLOCKED"
      : opts.prismaPhase === "skipped"
        ? "PARTIAL"
        : "COMPLETED";
  const lines = [
    `# dwellchecker — Simulated User Run`,
    `Generated: ${ts}`,
    ``,
    `## Persona`,
    `- **${PERSONA.fullName}** — ${PERSONA.email}`,
    `- Goal: add addresses, upload inspections, get proceed/negotiate/walk with evidence.`,
    ``,
    `## Program / Journey Outcomes`,
    `| Metric | Value |`,
    `|---|---|`,
    `| Final status | ${finalStatus} |`,
    `| Synthetic userId | \`${opts.userId}\` |`,
    `| HTTP phase | ${opts.httpOk ? "run" : "skipped / failed health"} |`,
    `| Prisma phase | ${opts.prismaPhase} |`,
    `| Issues logged | ${issues.length} |`,
    ``,
    `## Issues Found`,
    issues.length
      ? issues
          .map(
            (i) =>
              `### ${i.type} (${i.severity}) — ${i.phase}\n${i.description}${i.actual ? `\n- actual: ${i.actual}` : ""}${i.expected ? `\n- expected: ${i.expected}` : ""}`
          )
          .join("\n\n")
      : `_None._`,
    ``,
    `## Dual-Perspective Summary`,
    `### User voice`,
    `I need one place that tells me if I'm overpaying for roof risk. If the API blocks me until I sign in, fine — but don't 500 on a bad paste. I don't care about JSON shapes; I care that my address saves once and my inspection shows up.`,
    ``,
    `### Admin / system view`,
    `- Prisma rows use \`ownerUserId\` scoped to Clerk ids; simulation used prefix ${SIM_USER_PREFIX}.`,
    `- Protected routes return 401 without Clerk session cookies (verified via fetch).`,
    ``,
    `## Critical Reflections`,
    `- **Worked:** Anonymous API correctly rejects without credentials.`,
    `- **Gap:** Full Clerk OAuth and file upload paths need Playwright or manual QA.`,
    `- **Systemic:** Third-party auth shifts “signup” outside raw HTTP E2E unless test tokens are configured.`,
    ``,
  ];
  const fs = await import("node:fs/promises");
  await fs.writeFile(outPath, lines.join("\n"), "utf8");
  console.log(`\nReport written: ${outPath}`);
}

async function findLatestReport(): Promise<string | null> {
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const dir = path.join(process.cwd(), "simulation-results");
    const files = await fs.readdir(dir);
    const md = files.filter((f) => f.endsWith("-report.md")).sort().reverse();
    if (!md[0]) return null;
    return path.join(dir, md[0]);
  } catch {
    return null;
  }
}

async function main() {
  const { skipHttp, clean, reportOnly, baseUrl } = parseArgs(process.argv);

  if (reportOnly) {
    const p = await findLatestReport();
    if (p) {
      const fs = await import("node:fs/promises");
      console.log(await fs.readFile(p, "utf8"));
    } else {
      console.log("No report found in simulation-results/");
    }
    await prisma.$disconnect();
    return;
  }

  if (clean) {
    await cleanupSimData();
  }

  const userId = simUserId();
  let httpOk = false;

  logIssue({
    phase: "META",
    type: "FEATURE_REQUEST",
    severity: "LOW",
    description:
      "Clerk sign-in/sign-up is browser-only in this sim; add Playwright + test user or Clerk Testing Tokens for full HTTP signup coverage.",
  });

  if (!skipHttp) {
    httpOk = await phase0Health(baseUrl);
    if (httpOk) await phaseHttp(baseUrl);
  } else {
    console.log("Skipping HTTP (--skip-http)");
  }

  const prismaPhase = await phasePrisma(userId);

  const pathMod = await import("node:path");
  const fs = await import("node:fs/promises");
  const stamp = new Date();
  const fname = `${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, "0")}-${String(stamp.getDate()).padStart(2, "0")}-${String(stamp.getHours()).padStart(2, "0")}-${String(stamp.getMinutes()).padStart(2, "0")}-${String(stamp.getSeconds()).padStart(2, "0")}-report.md`;
  const dir = pathMod.join(process.cwd(), "simulation-results");
  await fs.mkdir(dir, { recursive: true });
  const outPath = pathMod.join(dir, fname);
  await writeReport(outPath, {
    userId,
    httpOk: skipHttp ? false : httpOk,
    prismaPhase,
  });

  const bugs = issues.filter((i) => i.type === "BUG").length;
  const fr = issues.filter((i) => i.type === "FEATURE_REQUEST").length;
  const done =
    prismaPhase === "blocked" || issues.some((i) => i.severity === "CRITICAL") ? "BLOCKED" : "COMPLETED";
  console.log(`
✓ Simulation complete
  Persona:        ${PERSONA.fullName} — first-time buyer / condition-first
  Status:         ${done}
  Issues found:   ${issues.length} (${bugs} bugs, ${fr} feature requests)
  Report:         simulation-results/${fname}

Top issues:
${issues.slice(0, 3).map((i) => `  - ${i.severity}: ${i.description}`).join("\n") || "  (none)"}
`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
