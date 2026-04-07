---
title: "OCR fallback, cost-dedupe, and regression tests for ingestion"
type: feat
status: active
date: 2026-04-07
origin: docs/plans/2026-04-07-001-feat-pdf-extraction-404-polish-spinners-plan.md
---

# OCR fallback, cost-dedupe, and regression tests for ingestion

## Overview

Follow-up to the PDF extraction work shipped earlier today (see origin in frontmatter). Three gaps surfaced during implementation and testing that are worth closing before anyone uses the product with real inspection reports. Each is scoped small, but together they turn ingestion from "works on happy path" into "works on the kind of reports real buyers actually upload."

1. **Scanned-PDF fallback.** `unpdf` does not do OCR. Many older inspection shops still print, sign, and scan. Without a fallback, those uploads hit `SCANNED_PDF` with a polite error and the user is stuck. We need a second-tier extractor that runs when the primary extractor returns no text.
2. **Cost double-counting in decide().** The normalizer now matches every category rule per finding (fixed in 001). The dedupe step collapses by `(category, component, severity)` hash. But if the same category appears twice in the same report with different severity language, `dedupeDefects` keeps both, and `decide()` sums their cost ranges. A single "roof" defect gets counted twice. The buyer sees inflated capital exposure.
3. **Zero regression tests.** The whole pipeline (extract → parse → map → dedupe → decide) has no unit tests. The build passes because nothing asserts behavior. Any refactor in this area is a blind cut.

## Problem Statement

### Scanned PDFs
The `SCANNED_PDF` code path at `lib/ingestion/extractors/pdf-extractor.ts:44` is triggered when extracted text is under 50 characters. That's the right detection but the wrong terminal. A buyer who's trying to evaluate a $900k house is not going to say "oh well, the report is scanned, I'll just give up." They'll think the product is broken. The fact that the error is polite is not the point. The product needs to do the job.

### Cost double-counting
In `lib/normalization/dedupe-defects.ts:7`, the key is `d.normalizedHash`, which is computed from `(category, component, severity)`. If a PDF says "roof shingles are worn" (parses as MODERATE) and then later says "roof covering at end of life" (parses as HIGH), the normalizer emits two defects with different hashes. Both survive dedupe. `decide()` at `lib/scoring/decision.ts:42` sums both `estimatedCostLow` and `estimatedCostHigh` values. The user sees `$16,000–$44,000` instead of the correct `$8,000–$22,000`. This is an invisible trust bug. The user has no way to know the number is doubled. They make a negotiation decision on a wrong number.

### Zero tests
- No test framework in the repo
- No unit tests for the pure functions (`mapRawFindings`, `dedupeDefects`, `decide`, `extractFromBuffer`)
- Every refactor requires a manual /qa cycle against production
- The bug above (cost double-counting) would have been caught in 10 seconds by a single test

## Proposed Solution

### Part 1 — OCR fallback via Vercel AI Gateway

**Recommendation: use the Vercel AI Gateway + a vision-capable LLM** (Claude Sonnet 4.5 or Gemini 2.5 Flash). Here's why over the alternatives:

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Vercel AI Gateway + vision LLM** | Already in the stack. One new env var. Handles scanned + text PDFs uniformly. Pay per use. | LLM-ish quality drift. Needs structured output to be reliable. | **Recommended** |
| **unstructured.io** | Purpose-built. Free tier. OSS self-host option. | New vendor. New env var. Separate rate limits. Need to model their response. | Fallback if AI Gateway path has issues |
| **AWS Textract** | Industry-standard OCR accuracy. | User's standing instruction: avoid AWS. | Rejected |
| **tesseract.js in the function** | Local. No API. | 30 MB bundle, 5–30 s latency, brittle on low-quality scans. | Rejected — wrong tool for serverless |
| **pdf.co** | Cheap OCR API. | New paid vendor. | Fallback |

**How it fits:** the `extractPdf` function in `lib/ingestion/extractors/pdf-extractor.ts` already throws `ExtractionError("SCANNED_PDF", ...)` when text is sparse. The upload route catches this and returns 422. The change is:

1. When `unpdf` returns empty text, don't throw — instead invoke a second-tier extractor
2. The second-tier extractor (`lib/ingestion/extractors/ocr-extractor.ts`) sends the PDF bytes to a vision LLM via the AI SDK (`@ai-sdk/provider` → AI Gateway)
3. Use a structured prompt: "Extract all visible text from this inspection report. Return plain text only, preserving section headings and line breaks."
4. Feed the result back into the same parse → map → dedupe pipeline. No changes to normalization.
5. If OCR also fails or returns under 50 chars, then throw `SCANNED_PDF`.

**Auth: use Vercel OIDC, no static token.** On Vercel, the AI SDK picks up `VERCEL_OIDC_TOKEN` automatically (injected into every function invocation) and the Gateway auto-authenticates. No secret to rotate, no value to leak. Local dev pulls a short-lived OIDC token into `.env.local` via `vercel env pull`. This is the current Vercel-recommended pattern and matches how the rest of this project handles env.

**New env vars:**
- `OCR_MODEL` — default `"anthropic/claude-sonnet-4.5"`. Documented overrides: `"google/gemini-2.5-flash"` (≈10x cheaper, slightly lower fidelity), `"anthropic/claude-opus-4.6"` (highest-quality extraction, ~5x cost). Switch by changing the env var, no code change.
- Feature flag: `ENABLE_OCR_FALLBACK=true|false` — ship with **false**, flip to true after testing against one real scanned inspection PDF.

**Latency budget:** current `maxDuration` is 60s. A vision model on a 20-page inspection PDF takes 5–15s. Safe.

**Cost:** at current Anthropic pricing, a 20-page inspection is ~15k input tokens + 3k output tokens ≈ $0.06 per report. Trivial for a per-upload product.

### Part 2 — Cost-aware dedupe

**Fix:** change the dedupe key from `(category, component, severity)` to `(category, component)`. When collapsing, keep the HIGHEST severity, but ALSO reconcile cost bands by taking the max of the high-range and the min of the low-range of overlapping defects — not the sum.

**Why not just dedupe by category alone:** some systems have multiple components (e.g., electrical panel + electrical wiring). Keep component granularity.

**Algorithm:**

```
for each defect d in incoming:
  key = (d.category, d.component)
  if key not in map: map[key] = d; continue
  existing = map[key]
  existing.severity = max(existing.severity, d.severity)  // by rank
  existing.urgency = max(existing.urgency, d.urgency)
  existing.estimatedCostLow = min(existing.estimatedCostLow, d.estimatedCostLow)
  existing.estimatedCostHigh = max(existing.estimatedCostHigh, d.estimatedCostHigh)
  existing.description = longer(existing.description, d.description)
```

Using `min(low) / max(high)` (not `sum`) because a single component has a single repair cost; repeating the mention doesn't multiply it. Taking the widest range across the two estimates preserves honest uncertainty instead of anchoring high, which is the trust-building move for a buyer-facing product.

**Regression risk:** any downstream code that assumes one-defect-per-mention will see fewer rows. The only downstream consumer is `recomputePropertyConditionProfile` → `decide()`, which iterates defects for score/capital-exposure. Result: score slightly higher (fewer penalties), capital exposure significantly lower (real numbers). Both corrections.

### Part 3 — Regression test suite (bootstrap + meaningful tests)

**Framework:** Vitest. It's the standard for modern Next.js 15/16 projects, zero-config with TypeScript, 10x faster than Jest, and the AI SDK ecosystem uses it.

**Setup:**
- Install `vitest`, `@vitest/ui` (optional), `happy-dom` (for component tests later)
- Add `vitest.config.ts` with a Node environment
- Add `"test": "vitest run"` and `"test:watch": "vitest"` to package.json
- Create `tests/` directory at repo root

**Tests to write (first pass — pure functions + one integration path):**

```
tests/
  normalization/
    map-raw-findings.test.ts
    dedupe-defects.test.ts
  scoring/
    decision.test.ts
  ingestion/
    extract-text.test.ts          # dispatcher routing
    parse-sections.test.ts
  integration/
    upload-dedupe-cost.test.ts    # end-to-end cost path through the ingestion pipeline
```

Each test file targets behavior, not implementation:

- **map-raw-findings:** single-rule match (roof), multi-rule match in one blob, no match returns empty, context slicing preserves surrounding words
- **dedupe-defects:** collapses by `(category, component)`, keeps highest severity, `min(low)/max(high)` cost reconciliation, preserves longest description
- **decision:** zero defects → INSUFFICIENT_DATA, one CRITICAL → WALK, three HIGH → NEGOTIATE, one HIGH → PROCEED_WITH_CONDITIONS, zero issues → PROCEED, capital exposure math
- **extract-text (dispatcher):** routes `application/pdf` → pdf extractor (mocked), routes `text/plain` → text extractor, routes `application/json` → text extractor, rejects unknown
- **parse-sections:** splits multi-paragraph text, filters lines under 20 chars, preserves punctuation
- **integration: upload-dedupe-cost:** feed a synthetic report containing the same category twice at different severities through `parseSections → mapRawFindings → dedupeDefects → decide`. Assert one defect remains, severity is the max, cost range is the `min(low)/max(high)` reconciliation (not the sum). This is the specific regression test for the cost double-count bug.

**What NOT to test in pass 1:**
- The PDF extractor itself (unpdf internals — not our code)
- The OCR extractor (mocked at the dispatcher boundary)
- Component rendering (separate effort, needs happy-dom + RTL)
- Prisma-touching API route handlers (needs a test DB + harness). The one integration test above is pipeline-only — no DB, no HTTP.

**Coverage target for pass 1:** all pure ingestion + scoring functions have at least one test, plus the one end-to-end pipeline test for the cost bug. That's the minimum bar.

## Technical Considerations

### OCR fallback
- **Import the AI SDK v6+ with Gateway provider**: `import { generateText } from "ai"` and `model: "anthropic/claude-sonnet-4.5"` (Gateway string format). No direct Anthropic SDK.
- **Binary input**: PDFs as file parts via the AI SDK's `file` content part. Claude accepts PDF directly, no rendering needed.
- **Node runtime only**: the extractor uses `Buffer`. Vercel Fluid Compute is Node by default — fine.
- **Cold start**: `ai` package is ~150KB. Bundle impact is trivial. No new native deps.
- **Rate limits**: Vercel AI Gateway has generous limits on Pro. If we ever need to batch, move to Queues later.
- **Prompt injection**: buyer-supplied PDFs are untrusted input. Treat extracted text as untrusted downstream (already do — regex-only normalization).

### Dedupe change
- Pure refactor in `lib/normalization/dedupe-defects.ts`. No schema change.
- `normalizedHash` column in Prisma already exists. Keep computing it by `(category, component, severity)` for traceability, but dedupe logic uses the `(category, component)` key.

### Test framework
- Vitest does not require transpilation — uses native ESM + Node.
- Vercel build should NOT run tests (keep CI separate). Add a `"prebuild": ""` or just don't touch the build script. Tests run locally and in a GitHub Actions workflow (to be added).
- No new CI platform. GitHub Actions workflow file `.github/workflows/test.yml` — Node 24, `npm ci`, `npm test`.
- No snapshot tests. They're a maintenance tax.

## System-Wide Impact

- **Interaction graph:** upload → dispatcher → `extractPdf` → (on empty text with flag) → `extractViaOcr` → AI Gateway → model → text → parseSections → mapRawFindings → dedupeDefects (new algorithm) → prisma tx → recomputeProfile → decide (now reading deduped costs).
- **Error propagation:** OCR failures (model timeout, gateway 5xx, rate limit) must fall through to `SCANNED_PDF` instead of surfacing as a new error code, so the user experience doesn't degrade. Log the cause for us; show the same polite error to the user.
- **State lifecycle:** unchanged. Inspection and job rows still reflect `extractedTextStatus: DONE/FAILED`.
- **API surface parity:** no changes to response shapes.
- **Integration test scenarios (live, not unit):**
  1. Upload a scanned inspection PDF with `ENABLE_OCR_FALLBACK=false` → 422 SCANNED_PDF (today's behavior)
  2. Same file with flag on → 200 with N defects
  3. Upload a text PDF with flag on → 200, OCR NOT invoked (primary path works)
  4. Upload a corrupt PDF with flag on → 422 CORRUPT_PDF (doesn't reach OCR)
  5. AI Gateway returns empty → 422 SCANNED_PDF (fell through cleanly)

## Acceptance Criteria

### OCR fallback
- [ ] `lib/ingestion/extractors/ocr-extractor.ts` created, uses AI SDK v6+ via Gateway model string
- [ ] `extractPdf` in `pdf-extractor.ts` calls OCR fallback when `env.ENABLE_OCR_FALLBACK === true` AND primary returns empty
- [ ] `env.ts` schema adds `OCR_MODEL` (default) and `ENABLE_OCR_FALLBACK` (default false); **no static API key** — rely on Vercel OIDC (`VERCEL_OIDC_TOKEN`) auto-injected at runtime
- [ ] Upload route unchanged (no new code in the handler)
- [ ] OCR failure falls through to `SCANNED_PDF` error code with debug logging
- [ ] Tested manually with a real scanned inspection PDF
- [ ] Flag is OFF by default — ship safely disabled, enable via env when ready

### Cost-aware dedupe
- [ ] `dedupeDefects` rewritten to key by `(category, component)`
- [ ] Keeps highest severity when collapsing
- [ ] Uses `min(low) / max(high)` (not `sum`) for cost reconciliation — preserves honest uncertainty
- [ ] Keeps longest description (existing behavior preserved)
- [ ] Regression test exercises each of these four behaviors
- [ ] Integration test confirms the end-to-end cost path through the pipeline

### Tests
- [ ] Vitest installed, `vitest.config.ts` committed
- [ ] `npm test` runs the full suite, zero failures
- [ ] At least one test per target module: `map-raw-findings`, `dedupe-defects`, `decision`, `extract-text` dispatcher, `parse-sections`
- [ ] Dedupe cost bug has a specific regression test (the one that would have caught the double-count)
- [ ] `.github/workflows/test.yml` runs tests on push + PR
- [ ] TESTING.md documents how to run tests locally

### Quality gates
- [ ] `next build` passes
- [ ] `npm test` passes
- [ ] Deploy to production succeeds
- [ ] Manual smoke test: upload a text PDF, verify defect count unchanged from previous ingestion

## Success Metrics

- **OCR hit rate:** % of initially-empty-text PDFs that produce ≥1 defect after OCR. Target: >70%.
- **Dedupe correction:** run the existing test property (`14 Linden Ave`) through the new normalizer. Expected capital exposure should drop if there were duplicates; confirm it matches a manual calculation of the test report content.
- **Test coverage:** all four pure functions have tests. Not aiming for 100% lines, aiming for 100% of the behaviors that matter.

## Dependencies & Risks

### Dependencies
- `ai` (AI SDK v6+) — Gateway model strings work out of the box, no provider package needed
- `vitest` (dev dep)
- Vercel AI Gateway integration linked to the `home-inspection` project (provides OIDC-authenticated access; zero env vars required)

### Risks
1. **AI SDK version drift.** The hook warnings earlier in this session said "AI SDK v6" is current and training data is stale. Before writing the OCR extractor, fetch the current AI SDK + Gateway docs via WebFetch and confirm the `generateText` call shape and `file` content part API.
2. **Silent cost regression.** Changing dedupe logic will change displayed numbers on existing test properties. That's intentional, but could surprise someone mid-demo. **Mitigation:** run the dedupe change isolated from OCR, verify numbers on the existing test property, then ship.
3. **Test framework bootstrap creep.** Vitest setup is 10 minutes. Writing meaningful tests is the actual work. Reject the temptation to chase 100% line coverage on pass 1.
4. **AI Gateway not yet provisioned.** The session earlier confirmed AI Gateway is available but we didn't link it yet. **Mitigation:** link the AI Gateway integration in the Vercel dashboard before implementing, so the env var exists when the code deploys.
5. **OCR quality on bad scans.** A faxed, re-printed, re-scanned 1998 inspection is going to extract badly. Claude will still try. The regex normalizer is forgiving — any keyword hit = a defect. Good enough for v1.

## Out of scope

Explicitly NOT in this plan:
- Component rendering tests (needs happy-dom + RTL + a separate setup)
- API route integration tests (needs a test DB + Prisma test harness)
- LLM-based normalization (letting the model categorize findings, not just extract text)
- Multi-vendor OCR fallback chain (one extractor is enough for v1)
- A test for the actual `extractPdf` function with a real PDF fixture (needs binary fixture management; defer)

## Sources & References

### Origin
- **Origin document:** `docs/plans/2026-04-07-001-feat-pdf-extraction-404-polish-spinners-plan.md` — the PDF extraction work that surfaced these three gaps. Key decisions carried forward: stay on the `extractFromBuffer` dispatcher pattern, process inline in the upload route, keep the normalization pipeline regex-based.

### Internal references
- `lib/ingestion/extractors/pdf-extractor.ts` — primary extractor, call site for OCR fallback
- `lib/ingestion/extract-text.ts` — dispatcher, unchanged
- `lib/normalization/dedupe-defects.ts:7` — the hash key that causes the cost bug
- `lib/scoring/decision.ts:42` — where the cost summing happens
- `lib/normalization/map-raw-findings.ts` — multi-rule matcher shipped in 001
- `app/api/properties/[id]/uploads/route.ts` — upload handler, unchanged

### External references (verify before implementing)
- Vercel AI Gateway docs: `https://vercel.com/docs/ai-gateway` — confirm model string format
- AI SDK v6 reference: `https://sdk.vercel.ai/docs` — confirm `generateText` + file content part
- Vitest docs: `https://vitest.dev` — confirm current config for Node + TypeScript + ESM

### Related work
- Plan 2026-04-07-001 commits (7 total): spinners, 404s, pdf-parse → unpdf swap, normalizer multi-rule fix, error message hardening

## Implementation order (locked)

1. **Test framework bootstrap first.** 25 minutes. Install Vitest, write `vitest.config.ts`, add `npm test`, write all six test files (5 pure function + 1 integration) against the **current** behavior. The dedupe and integration tests start RED because the current code has the cost bug. Commit the red tests as "test: add ingestion test suite (dedupe tests currently fail on known bug)". Push the GitHub Action. Deploy (no production impact).
2. **Dedupe fix.** 15 minutes. Rewrite `dedupeDefects` with the new key + `min/max` reconciliation. Red tests go green. Ship. This order means the regression coverage arrives before the fix that depends on it.
3. **OCR fallback.** 45 minutes after you link the AI Gateway integration in the Vercel dashboard. Ship with `ENABLE_OCR_FALLBACK=false`. Manual smoke test with a real scanned PDF, then flip the flag in production.

Three commits minimum (plus any fixups). Each reverses independently if anything goes sideways.
