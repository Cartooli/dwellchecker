---
title: "PDF extraction, 404 page polish, mutation loading spinners"
type: feat
status: active
date: 2026-04-07
---

# PDF extraction, 404 page polish, mutation loading spinners

## Overview

Three deferred items surfaced during the /qa session on 2026-04-07 after the MVP shipped to https://www.condition.homes. Each is independently valuable and independently shippable, but they share a theme: **the product currently works on the happy path but looks unfinished at the edges.** This plan covers all three so they can be bundled into one refinement sprint.

1. **Real PDF inspection extraction.** The current `lib/ingestion/extract-text.ts` only handles text and JSON payloads. Real buyers will upload PDF inspection reports. Without PDF support, the core upload flow is theatrical for most users.
2. **Branded 404 page.** Next.js's default not-found page breaks the dark editorial aesthetic and feels like a dev-mode leak.
3. **Proper loading states on mutations.** The "Add property" and "Upload & analyze" buttons currently change their label text but show no spinner. During a slow upload (multi-MB PDF, cold function), the user has no feedback that work is happening.

## Problem Statement

**PDF extraction gap is the biggest one.** The normalization pipeline (`lib/normalization/map-raw-findings.ts`) is solid and handles real inspection language well — verified in QA with 5 findings correctly mapped. But the extractor at `lib/ingestion/extract-text.ts:4` is a 12-line stub that fetches the file URL and only returns text if `content-type` includes `"text"` or `"json"`. PDF uploads currently hit the upload route (which processes inline using the in-memory buffer at `app/api/properties/[id]/uploads/route.ts:68`), parse as empty text, map zero findings, and silently produce a "score 0 · Insufficient data" result. No error. No signal to the user that anything is wrong. **This is a trust bug, not a cosmetic one.** A buyer who uploads their real inspection report and sees "Insufficient data" will think the product doesn't work.

**404 page.** Hit `/dashboard/properties/bogus-id` and you get `notFound()` → Next.js default. White background, serif font, jarring against the rest of the site.

**Loading spinners.** Buttons use `disabled={busy}` and change label text ("Adding…", "Working…"). On a fast connection with a small file this is invisible. On a 5 MB PDF with a cold Vercel function (~3–8 seconds), the user stares at a barely-changed button and wonders if they should click again. They will click again. They shouldn't have to wonder.

## Proposed Solution

### Part 1 — PDF extraction

**Critical research flag:** The user suggested `pdfshift.io`, but PDFShift is an **HTML → PDF** service, not PDF → text. Its API does not offer text extraction. Before committing, confirm with the user. This plan documents both paths so the decision is clear.

**Path A (recommended) — `pdf-parse` library, zero external dependencies.**

- `pdf-parse` is a mature npm library that runs in Node.js (Fluid Compute is Node.js — works fine on Vercel Functions).
- No API key. No per-page cost. No network round trip.
- Handles the 95% case: searchable PDFs (which is what every professional inspection software produces).
- Fails on scanned image-only PDFs, but those are rare and can be flagged with a clear error.
- Cost: 0. Latency: ~200–800ms for a typical 20-page inspection report. Well under `maxDuration: 60`.

**Path B — External PDF extraction API.**

- Candidates if the user insists on an API: **pdf.co**, **unstructured.io**, **Mathpix**, or **AWS Textract** (flagged because the user's global preference avoids AWS).
- pdfshift.io is NOT a candidate — wrong product category.
- Trade-off: external APIs handle scanned PDFs via OCR, but add latency (1–5s), cost per call, a new env var, and an outage dependency.

**Recommendation: ship Path A (pdf-parse) now.** Add a graceful fallback message when extraction returns empty text ("We couldn't read this PDF. It may be scanned. Please upload a text-based report or paste the content."). Keep the env var contract for `PDF_SHIFT_API_KEY` ready as `EXTRACTION_API_KEY` so we can swap providers later without code churn.

**Architecture:**

```
lib/ingestion/
  extract-text.ts          # existing — becomes dispatcher
  extractors/
    text-extractor.ts      # handle text/plain, text/csv, application/json
    pdf-extractor.ts       # NEW — use pdf-parse on buffer
  types.ts                 # NEW — ExtractionResult { text, pageCount, method, warnings }
```

The upload route (`app/api/properties/[id]/uploads/route.ts`) currently passes the in-memory buffer into `parseSections`. We'll insert an extraction dispatch step: detect content type from the uploaded `File.type` (already available), route to the right extractor, then feed the resulting text into `parseSections` as before. **No changes to the normalization pipeline.**

### Part 2 — 404 page polish

One file: `app/not-found.tsx`. Reuse the existing dark editorial theme — same `.container`, same hero-ish vertical rhythm, same muted palette, one decisive CTA back to `/dashboard`. Mirror the landing page headline voice: direct, plain, not cute. No mascot, no emoji, no "oops!".

Also add a property-level not-found: `app/dashboard/properties/[propertyId]/not-found.tsx` with a specific message ("That property isn't in your account.") and a link back to the dashboard.

### Part 3 — Loading spinners on mutations

Create a small, shared `<Spinner />` component (pure CSS keyframe, no JS). Inline in the button next to the label. Add to:

- `components/dashboard/AddPropertyForm.tsx` — submit button
- `components/upload/UploadForm.tsx` — submit button
- Any future mutation button inherits the pattern

The spinner already has a visual language to match: the gold accent (`--accent`). A 14px ring with a rotating gap, 600ms rotation, `prefers-reduced-motion: reduce` respected (falls back to a pulse).

## Technical Considerations

### PDF extraction

- **Package choice:** `pdf-parse` v1.1.1 (stable, 600k weekly downloads, no maintained alternative with better API). Note: `pdf-parse` has a transitive dependency on `pdfjs-dist` which is large (~2 MB). Acceptable — Vercel Fluid Compute cold starts are amortized across concurrent requests.
- **Vercel compatibility:** pdf-parse is pure Node.js, no native bindings, works in Vercel Functions (Node.js 24 LTS). No edge runtime compatibility needed — we're already on the Node runtime.
- **Memory:** A 50-page inspection PDF uses ~30 MB of RAM during parse. Default Vercel Fluid Compute memory is fine.
- **Security:** `pdf-parse` has had CVEs in the past (ReDoS in text parsing). Pin to latest patch. Audit before merge.
- **Error handling:** `pdf-parse` throws on corrupt PDFs, password-protected PDFs, and scanned images with no text layer. Wrap in try/catch, surface a specific error message per case to the user.
- **Upload route changes are isolated.** The current inline-processing architecture (buffer → parse → normalize → persist) is preserved. Only the `buffer → text` step changes from `.toString("utf8")` to an extractor dispatch.

### 404 pages

- Next.js App Router: `app/not-found.tsx` for global, `app/<segment>/not-found.tsx` for segment-scoped, both triggered by `notFound()` from `next/navigation`.
- Confirm server components are fine (no client interactivity needed, just static).
- Metadata: add a `<title>` so the browser tab doesn't just say "404".

### Loading spinners

- Pure CSS using `@keyframes spin` — no additional dependencies.
- Use `aria-live="polite"` on the status text and `aria-busy="true"` on the button during submission for screen reader users.
- Prevent double-submit — already handled by the `busy` state in both forms, no regression risk.
- `prefers-reduced-motion` media query for accessibility.

## System-Wide Impact

- **Interaction graph:** upload PDF → extractor dispatcher → pdf-parse → parseSections → mapRawFindings → dedupeDefects → prisma tx → recomputeProfile. New failure mode: extractor throws → try/catch in upload route → inspection row marked FAILED, defectCount 0, clear error message surfaced in response.
- **Error propagation:** extractor errors must not leak stack traces to the client. Log full error via `lib/logging/logger.ts`, return `{ error: { code: "EXTRACTION_FAILED", message: "friendly text" } }` with HTTP 422.
- **State lifecycle risks:** upload route already creates Inspection row **before** calling the extractor. If extraction fails, we have an orphaned inspection with `rawReportUrl` pointing to Blob but no defects. Currently the error path marks the job FAILED. We should also mark the Inspection rows `extractedTextStatus: "FAILED"` so the property page can show a "retry upload" affordance later. Add this to acceptance criteria.
- **API surface parity:** no API shape changes. The upload response stays the same, but `defectCount` may now reflect real PDF-extracted findings.
- **Integration test scenarios:**
  1. Upload `.txt` with 3 findings → 3 defects (existing behavior preserved)
  2. Upload text-based PDF (inspection report) → N defects matching content
  3. Upload scanned image-only PDF → HTTP 422 with clear "scanned PDF not supported" message, Inspection marked FAILED, no orphaned defects
  4. Upload corrupt PDF → HTTP 422 with "could not read file", Inspection FAILED
  5. Upload password-protected PDF → HTTP 422, specific error

## Acceptance Criteria

### PDF extraction

- [ ] `pdf-parse` added to dependencies, pinned to latest stable, `npm audit` clean
- [ ] `lib/ingestion/extract-text.ts` refactored into a dispatcher that routes by content type
- [ ] `lib/ingestion/extractors/pdf-extractor.ts` created, uses in-memory buffer (no blob refetch)
- [ ] `lib/ingestion/extractors/text-extractor.ts` created, covers txt/csv/json
- [ ] Upload route at `app/api/properties/[id]/uploads/route.ts` calls the dispatcher before `parseSections`
- [ ] Successful PDF upload produces real defects visible on the property page (verified with a real inspection report)
- [ ] Corrupt PDF returns HTTP 422 with a clear message, no 500
- [ ] Scanned image-only PDF returns HTTP 422 with a specific message
- [ ] Password-protected PDF returns HTTP 422 with a specific message
- [ ] Inspection row marked `extractedTextStatus: "FAILED"` on extractor error (not just the job)
- [ ] `env.ts` has a placeholder `EXTRACTION_API_KEY` for future provider swap (not used now)

### 404 polish

- [ ] `app/not-found.tsx` created, matches dark editorial theme, has "Return home" CTA
- [ ] `app/dashboard/properties/[propertyId]/not-found.tsx` created with property-specific copy
- [ ] Both pages have proper `<title>` metadata
- [ ] Verified by visiting `/bogus` and `/dashboard/properties/bogus-id`

### Loading spinners

- [ ] `components/ui/Spinner.tsx` created (pure CSS keyframe component)
- [ ] `AddPropertyForm.tsx` shows spinner during submission
- [ ] `UploadForm.tsx` shows spinner during submission
- [ ] `prefers-reduced-motion` respected (static pulse fallback)
- [ ] `aria-busy="true"` applied to button during submission
- [ ] Double-submit still prevented

### Quality gates

- [ ] `next build` passes
- [ ] Deploy to production succeeds
- [ ] Re-run /qa on condition.homes — health score stays at 94 or improves
- [ ] Test with a real inspection PDF (user supplies) — at least 3 defects extracted

## Success Metrics

- **PDF extraction:** % of uploaded PDFs that produce ≥1 defect. Target: >90% on real buyer-supplied reports. Track via a simple count in `AuditEvent`.
- **404 bounces:** qualitative — does the page feel on-brand?
- **Upload completion:** % of upload button clicks that proceed to a result page without the user double-clicking. Target: >95%.

## Dependencies & Risks

### Dependencies

- **pdf-parse** (~2 MB including transitive deps). Adds to cold start. Acceptable given Fluid Compute instance reuse.
- No new external services. No new env vars required (just a placeholder for future).

### Risks

1. **User insisted on pdfshift.io.** High risk of wasted work if we build pdf-parse and they wanted an external API for a reason I don't know. **Mitigation:** ask before implementing. Present both paths with the pdfshift.io clarification ("PDFShift does HTML→PDF, not PDF→text. Did you mean a different service, or are you OK with `pdf-parse` as the local default?").
2. **Scanned PDFs.** Some older inspection shops still print and scan. If this rate is >10%, we need OCR (unstructured.io or AWS Textract). **Mitigation:** ship pdf-parse, instrument the failure rate, add OCR later if needed.
3. **pdf-parse CVEs.** Historical ReDoS issues. **Mitigation:** pin latest patch, audit on install, add to dependabot.
4. **Memory on large PDFs.** A 200-page inspection could OOM a small function instance. **Mitigation:** reject files >25 MB at the route boundary (already enforced via `UPLOAD_MAX_BYTES`).
5. **Spinner overreach.** Adding a `<Spinner />` shared component is a temptation to refactor other button styles. **Mitigation:** scope to the two forms in-plan; reject drive-by button refactors in review.

## Out of scope

Explicitly NOT in this plan:
- OCR for scanned PDFs
- Moving extraction to a background job or Vercel Queue
- Image bundle parsing (photos with captions)
- Structured report vendor integrations (Spectora, ISN, HomeGauge webhooks)
- Auth on the 404 page
- Skeleton loading states on `/dashboard` and property pages (separate concern)

## Sources & References

### Internal references

- `lib/ingestion/extract-text.ts` — current stub, 12 lines, needs refactor
- `lib/ingestion/parse-sections.ts` — unchanged, consumes text output from extractor
- `lib/normalization/map-raw-findings.ts` — unchanged, working well per QA
- `app/api/properties/[id]/uploads/route.ts:68` — inline processing entry point
- `components/dashboard/AddPropertyForm.tsx` — mutation #1
- `components/upload/UploadForm.tsx` — mutation #2
- `app/globals.css` — design tokens (accent color, radius, transitions)

### External references

- `pdf-parse` on npm: https://www.npmjs.com/package/pdf-parse
- Vercel Fluid Compute Node.js runtime docs (current: Node 24 LTS default)
- Next.js App Router `not-found.tsx` docs
- WAI-ARIA `aria-busy` and `aria-live` for mutation feedback

### Related work (this session)

- QA report: ~/.gstack/projects/Cartooli-dwellchecker/ (if written) — health score 94 post-fix
- Commit `fix(qa): process ingestion inline from upload buffer` — established the inline-processing pattern this plan extends
- Commit `fix(qa): use private access for Blob store` — Blob storage now settled

## Implementation order (suggested)

1. **Ask the user about pdfshift.io vs pdf-parse.** Block on answer.
2. **Spinner + 404 polish first** (~15 min, low risk, pure UI). Ship together.
3. **PDF extraction** (~45 min, includes testing with a real PDF). Ship separately so any issues are isolated.
4. **Re-run /qa.** Confirm health score.

One commit per part. One deploy per commit is fine for a solo project on Vercel.
