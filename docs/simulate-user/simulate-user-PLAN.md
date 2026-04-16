# dwellchecker — Simulated User Journey Plan
Generated: 2026-04-16T15:46:22Z  
Stack: Next.js 15 (App Router) · TypeScript · Prisma · PostgreSQL · Clerk · Vercel Blob  
Trigger: `/simulate-user-e2e-test`

---

## Persona

**Name:** Priya Natarajan  
**Role:** Senior program manager at a mid-size biotech (remote-first); first-time buyer in a hot market  
**Email (sim):** `priya.natarajan.sim+20260416@example.com`  
**Location:** Somerville, MA, USA

**Background:**
- Lost a bid last year after waiving inspection; now refuses to move without a clear condition read on every finalist property.
- Reads inspection PDFs at 11pm and hates agent-speak; wants one plain verdict: proceed, negotiate, or walk.
- Uses Google SSO everywhere when offered; impatient if auth redirects loop or dashboards stay empty.
- Keeps a spreadsheet of addresses; will paste long Zillow notes into any “notes” field if the app has one.

**Use case / goal:**  
Priya wants to add each serious contender by address, upload the seller’s inspection report, and get a scored recommendation she can compare side-by-side before making an offer. Success means fewer surprises at closing and a defensible number for negotiation. She will churn if uploads silently fail or scores change without explanation.

**Personality in simulation:**
- Meticulous: re-reads validation errors and tries edge-case addresses (wrong ZIP, duplicate add).
- Impatient: abandons flows that show a blank screen for more than a few seconds.
- Files issues when copy says “My Application” or when API errors are raw JSON with no human line.

---

## App Overview (discovered)

**What it does:** Buyer-first property condition intelligence: properties keyed by address per user, inspection ingestion, defects, risk, and a `PropertyConditionProfile` with recommendation and score.  
**Auth model:** **Clerk** — hosted sign-in/sign-up (`/sign-in`, `/sign-up`); `clerkMiddleware` protects all non-public routes. Public: `/`, `/sign-in`, `/sign-up`, internal `POST /api/ingestion/jobs/:id/process`.  
**Key entities:** `Property`, `PropertyConditionProfile`, `Inspection`, `Defect`, `RiskFlag`, `IngestionJob`, `PropertyShare`, `AuditEvent`.  
**Core job-to-be-done:** Add a property by address → upload inspection → poll ingestion → read profile score and recommendation → optionally compare multiple properties.

---

## Journey Map

### Phase 1: Discovery & landing
| Step | Action | Expected | Edge case to test |
|---|---|---|---|
| 1.1 | GET `/` | 200, marketing + CTA to dashboard | — |
| 1.2 | Visit `/dashboard` without session | Redirect / empty until Clerk (browser) | Middleware `auth.protect()` |
| 1.3 | Open `/sign-in` | Clerk embed loads | Hydration delay (blank flash) |

### Phase 2: Authentication (Clerk — browser-first)
| Step | Action | Expected | Edge case |
|---|---|---|---|
| 2.1 | Sign up with Google / email | Session established | Duplicate email (Clerk handles) |
| 2.2 | Access `/dashboard` signed in | Property list + add form | — |
| 2.3 | Call `POST /api/properties/upsert` **without** session | **401** JSON envelope | — |
| 2.4 | Call `GET /api/properties/:id` **without** session | **401** | — |

*Simulation note:* Automated script cannot complete Clerk OAuth without browser credentials. We validate **401 on protected APIs** and use a **synthetic `ownerUserId`** for Prisma flows that mirror `upsertProperty` behavior after login.

### Phase 3: Core flow — add property & profile
| Step | Action | Expected | Notes |
|---|---|---|---|
| 3.1 | `POST /api/properties/upsert` with valid body | `propertyId`, `created: true` | Zod: street1, city, state, postalCode |
| 3.2 | Repeat same address | `created: false` | Per-owner dedupe |
| 3.3 | `GET /api/properties/:id` as owner | Full property + profile | — |
| 3.4 | Upload inspection (multipart) | Job created | Requires Blob token + signed-in user in real use |

### Phase 4: Edge cases & friction
| Step | Input | Expected behavior | Why testing this |
|---|---|---|---|
| 4.1 | `street1` > 200 chars | **400** `VALIDATION_ERROR` | Zod max length |
| 4.2 | Empty JSON or missing fields | **400** | API envelope |
| 4.3 | Invalid `state` (one letter) | **400** | `state` min 2 chars |
| 4.4 | Unknown property id (authed) | **404** | Not found mask |

### Phase 5: Secondary flows
| Step | Action | Purpose |
|---|---|---|
| 5.1 | `/dashboard/compare` | Multi-property comparison (if data exists) |
| 5.2 | `POST /api/properties/:id/shares` | Invite read-only by email |
| 5.3 | `GET /api/ingestion/jobs/:id` | Poll job status |

### Phase 6: Admin / operator view
| Step | Action | Expected |
|---|---|---|
| 6.1 | Prisma: rows for sim `ownerUserId` prefix | Properties created in simulation |
| 6.2 | Internal worker route | Secret-gated; not user-simulated here |

---

## Forms Inventory

| Form | Location | Fields | Validations to test |
|---|---|---|---|
| Add property | `/dashboard` (`AddPropertyForm`) | street, city, state, ZIP, optional year | Required fields, US-style state |
| Clerk sign-in/up | `/sign-in`, `/sign-up` | OAuth / email | Hosted by Clerk |
| Upload | `/dashboard/properties/[id]/upload` | file multipart | Size/type in real browser test |

---

## API Endpoints to Test

| Endpoint | Method | Auth required | Happy path | Error cases |
|---|---|---|---|---|
| `/api/properties/upsert` | POST | Yes | 200 + ids | 400 validation, 401 |
| `/api/properties/:id` | GET | Yes | 200 property | 401, 404 |
| `/api/properties/:id/shares` | POST | Owner | invite | 401, 403/404 |
| `/api/properties/:id/uploads` | POST | Owner | job | 401 |
| `/api/ingestion/jobs/:id` | GET | Yes (read access) | job status | 401, 404 |
| `/api/ingestion/jobs/:id/process` | POST | Internal secret | worker | (not in user sim) |

---

## Issues to Watch For

- [ ] Clerk + dark shell: hosted Account Portal vs app theme mismatch on redirects.
- [ ] Blank flash before Clerk hydrates on `/sign-in` / `/sign-up`.
- [ ] `ownerUserId` scoping: users must not see others’ properties (404 mask).
- [ ] Duplicate address same owner: idempotent upsert, not duplicate rows.
- [ ] Long inspection PDFs / ingestion failures: job `errorMessage` surface.

---

## Success Criteria

The simulation is complete when:
- [x] Public `/` and protected API behavior documented
- [x] At least 2 validation edge cases on `PropertyUpsertInput`
- [x] Auth protection verified (401 without session) via HTTP
- [x] Core domain path exercised via Prisma + `upsertProperty` (synthetic user)
- [x] At least 1 realistic friction logged (Clerk HTTP gap or UX)
- [x] Dual-perspective report written

---

## Script Plan

**Script path:** `scripts/simulate-user.ts`  
**Run command:** `npx tsx --tsconfig tsconfig.json scripts/simulate-user.ts`  
**DB access:** Prisma direct (`upsertProperty`, cleanup `deleteMany`)  
**HTTP tests:** Yes when server reachable (`--skip-http` to skip)  
**Cleanup:** `scripts/simulate-user.ts --clean` removes `Property` rows where `ownerUserId` starts with `user_sim_e2e_`
