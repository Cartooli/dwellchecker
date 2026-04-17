# dwellchecker — Simulated User Journey Plan
Generated: 2026-04-17T00:00:00.000Z  
Stack: Next.js 15 App Router, TypeScript, Prisma + PostgreSQL, Clerk auth, Vercel Blob  
Trigger: `/simulate-user-e2e-test`

---

## Persona

**Name:** Priya Natarajan  
**Role:** Senior product designer at a fintech, first-time homebuyer in Greater Boston  
**Email (sim):** `priya.natarajan.sim+[timestamp]@example.com`  
**Location:** Somerville, MA, USA

**Background:**
- Under contract on a 1920s two-family and drowning in inspection PDFs and agent optimism.
- Wants a single score and a plain-English proceed / negotiate / walk signal before renegotiation.
- Comfortable with SaaS; expects sign-in before anything sensitive; impatient with vague errors.
- Has been burned by duplicate CRM entries at work—expects address deduplication to “just work.”

**Use case / goal:**  
Add her candidate property by address, see condition profile and recommendation, and eventually upload an inspection report so the app can normalize defects and surface capital exposure—without becoming a PDF engineer.

**Personality in simulation:**
- Meticulous: tests long pasted street lines and invalid state abbreviations.
- Skeptical of APIs: notices if anonymous calls leak data or return 500 instead of 401.
- Will file a feature request if Clerk blocks headless signup—expects that gap to be explicit.

---

## App Overview (discovered)

**What it does:** Buyer-first property condition intelligence—properties, inspections, ingestion jobs, condition profiles with proceed/negotiate/walk-style recommendations.  
**Auth model:** Clerk (`@clerk/nextjs`) — `clerkMiddleware` with public routes: `/`, `/sign-in`, `/sign-up`, internal worker `POST /api/ingestion/jobs/:id/process`. All other UI and API require session.  
**Key entities:** `Property`, `PropertyConditionProfile`, `Inspection`, `Defect`, `RiskFlag`, `IngestionJob`, `PropertyShare`, `AuditEvent`  
**Core job-to-be-done:** Add a property, upload inspection content, get a scored profile and actionable recommendation (and optionally share read-only with a co-buyer).

---

## Journey Map

### Phase 1: Discovery & marketing
| Step | Action | Expected | Edge case to test |
|---|---|---|---|
| 1.1 | Visit `/` | 200, hero + CTA | — |
| 1.2 | Click “Open dashboard” without session | Redirect to Clerk sign-in | — |
| 1.3 | Visit `/dashboard` unauthenticated | Redirect / sign-in | — |

### Phase 2: Authentication (Clerk — browser-heavy)
| Step | Action | Expected | Edge case |
|---|---|---|---|
| 2.1 | Open `/sign-up` | Clerk sign-up UI | Invalid email format |
| 2.2 | Complete sign-up | Session, redirect to app | — |
| 2.3 | Sign out | Session cleared | Back button to protected page → sign-in |
| 2.4 | Sign in with wrong password | Clerk error | — |

> **Simulation note:** Automated script cannot complete OAuth/email verification without Playwright + test user or Clerk Testing Tokens. Script validates API **401** for anonymous calls and uses a **synthetic `ownerUserId`** for Prisma domain tests.

### Phase 3: Dashboard — add property
| Step | Action | Expected | Notes |
|---|---|---|---|
| 3.1 | Land on `/dashboard` signed in | “Your properties” + `AddPropertyForm` | — |
| 3.2 | Submit add-property form (client → `POST /api/properties/upsert`) | `propertyId`, navigate to detail | Empty required field → browser validation / API 400 |
| 3.3 | Duplicate same address submit | Same `propertyId`, `created: false` | Per-owner unique constraint |

### Phase 4: Property detail & sharing
| Step | Action | Expected | Notes |
|---|---|---|---|
| 4.1 | `/dashboard/properties/[id]` | Detail, profile, defects list | Invalid id → 404 |
| 4.2 | `PropertyInviteForm` → `POST /api/properties/:id/shares` | Invite by email | Non-owner → 403 (if enforced) |
| 4.3 | Read-only sharee | Sees property, cannot write | `ownerUserId` ≠ viewer |

### Phase 5: Upload & ingestion
| Step | Action | Expected | Notes |
|---|---|---|---|
| 5.1 | `/dashboard/properties/[id]/upload` | Multipart upload | Large file, wrong type |
| 5.2 | Poll `GET /api/ingestion/jobs/:id` | Status progression | — |
| 5.3 | Internal `POST /api/ingestion/jobs/:id/process` | Secret-gated | No session; worker secret |

### Phase 6: Compare
| Step | Action | Expected | Notes |
|---|---|---|---|
| 6.1 | `/dashboard/compare` | Lists tracked properties | Empty state if none |

### Phase 7: Edge cases & friction
| Step | Input | Expected behavior | Why testing this |
|---|---|---|---|
| 7.1 | `street1` > 200 chars | Zod / API 400 | Data integrity |
| 7.2 | `state` = `"M"` | Zod reject | Validation |
| 7.3 | Anonymous `POST /api/properties/upsert` | **401** | Auth boundary |
| 7.4 | Anonymous `GET /api/properties/:id` | **401** | Auth boundary |
| 7.5 | Malformed JSON to upsert without session | **401** (auth before parse) | Order of checks |

---

## Forms Inventory

| Form | Location | Fields | Validations to test |
|---|---|---|---|
| Add property | `/dashboard` (`AddPropertyForm`) | street1, city, state, postalCode | required, state maxLength 2, API Zod |
| Clerk sign-in/up | `/sign-in`, `/sign-up` | (Clerk-managed) | email, password policies — manual / Playwright |
| Invite | Property page (`PropertyInviteForm`) | email | owner-only, duplicate invite |

---

## API Endpoints to Test

| Endpoint | Method | Auth | Happy path | Error cases |
|---|---|---|---|---|
| `/api/properties/upsert` | POST | Yes | 200 + `propertyId` | 401 anon, 400 validation |
| `/api/properties/:id` | GET | Yes (owner/share) | 200 detail | 401 anon, 404 |
| `/api/properties/:id/shares` | POST | Owner | share created | 401, 403 |
| `/api/properties/:id/preanalyze` | POST | Owner | profile recompute | 401, 403 |
| `/api/properties/:id/uploads` | POST | Owner | job created | 401, 400 |
| `/api/ingestion/jobs/:id` | GET | Viewer | job status | 401 |
| `/api/ingestion/jobs/:id/process` | POST | Secret | worker | no session |

---

## Issues to Watch For

- [ ] Clerk flows not covered by raw `fetch` — need Playwright or Testing Tokens for true signup/login HTTP.
- [ ] Dashboard returns `null` when `!userId` — ensure middleware redirect always runs (no blank page flash).
- [ ] File upload and ingestion require Blob token + worker secret — local sim may skip.
- [ ] Legacy `ownerUserId = legacy-unassigned` — migration edge per README.

---

## Success Criteria

The simulation is complete when:
- [x] Health and anonymous API boundaries exercised (or skipped with reason)
- [x] Prisma path: upsert + idempotent duplicate + Zod edge cases
- [x] At least one realistic limitation logged (Clerk / browser)
- [x] Report written under `simulation-results/`

---

## Script Plan

**Script path:** `scripts/simulate-user.ts`  
**Run command:** `npx tsx scripts/simulate-user.ts` (or `npm run simulate-user`)  
**DB access:** Prisma direct (`@/lib/db/client`, `@/lib/domain/property`)  
**HTTP tests:** Yes when server reachable. Default `--base-url` is `http://localhost:3020` (see script comment if `:3000` is occupied by another app).  
**Cleanup:** `--clean` deletes `Property` rows where `ownerUserId` starts with `user_sim_e2e_`
