---
date: 2026-04-13
topic: user-scoped-properties-auth
---

# User-scoped properties, sign-in, and read-only sharing

## Problem Frame

The app currently stores properties in a single global pool: every visitor sees the same list, and property URLs are not access-controlled. For a buyer-facing product (Dwellchecker / condition.homes), that breaks privacy and trust. Affected users include anyone evaluating homes whose addresses and condition interpretations should not be visible to other visitors.

## Requirements

- R1. **Auth gate (app)**: Routes under `/dashboard` (including compare and nested property routes) require an authenticated session. Public marketing or home content may remain reachable without sign-in.
- R2. **Ownership**: Every property is associated with exactly one owning account. New properties created while signed in belong to the current user.
- R3. **Authorization**: Users may only load and mutate properties they own, or properties shared with them as described in R5. List views, detail pages, and server APIs enforce the same rules (no insecure direct object references).
- R4. **Legacy data**: Existing rows in the shared pool are attached to a single designated **internal** account at migration time. That account exists to retain history; routine product behavior does not assume operators browse end-user data through it unless explicitly needed for support.
- R5. **Read-only sharing**: A property owner may grant **read-only** access to another person. The invitee **must sign in** (or sign up) before seeing the shared property. Shared properties appear in the invitee’s dashboard in a way that makes origin clear (e.g. label or section such as “Shared with you” — exact UX deferred to planning).
- R6. **Session lifecycle**: Sign-out and standard account recovery behaviors follow the chosen authentication provider’s capabilities (details deferred to planning).

## Success Criteria

- A signed-in user A cannot view, list, or API-access user B’s properties by guessing or obtaining a property id (verified by manual or automated tests).
- A user who has not accepted an invite cannot access a property shared with someone else.
- Legacy properties remain accessible only to the designated internal account (and anyone that account explicitly shares with, if ever used that way) — not to arbitrary new users.

## Scope Boundaries

- **Out of v1**: Edit/collaboration on the same property record, ownership transfer, organizations/teams, and anonymous or magic-link **viewing without sign-in**.
- **Out of v1**: Defining which auth vendor or exact sign-in methods (email link vs OAuth) — product requirement is “secure accounts with sign-in required”; selection is a planning/implementation decision.
- **Out of v1**: Legal/compliance copy beyond what the auth provider supplies (e.g. full privacy policy) unless separately requested.

## Key Decisions

- **Public app vs dashboard**: Marketing/home can stay public; all dashboard and property app routes require authentication.
- **Legacy migration**: Pre-scope data is assigned to one internal account rather than deleted or left ownerless.
- **Sharing model**: Read-only sharing ships in v1; invitees must authenticate; magic-link public viewing is explicitly later or out of scope.
- **Internal account**: Used for legacy attachment; not a substitute for multi-tenant admin snooping on user data.

## Dependencies / Assumptions

- A production identity solution will be integrated (vendor TBD); requirements assume stable user ids and authenticated server contexts.
- Database can represent ownership and share relationships (exact shape deferred to planning).

## Outstanding Questions

### Resolve Before Planning

- None identified from this brainstorm — provider choice and schema are planning work, not blocking product definition.

### Deferred to Planning

- [Affects R1–R3][Technical] Auth library/provider and Next.js integration patterns.
- [Affects R3][Technical] Migration strategy for attaching `userId` (or equivalent) and backfilling the internal account.
- [Affects R5][Technical] Invite delivery (email), acceptance flow, and revocation UX.
- [Affects R5][UX] Exact dashboard layout for owned vs shared properties.

## Next Steps

→ `/ce:plan` for structured implementation planning (or equivalent planning pass in your toolchain).

## Approaches Considered (brief)

- **Baseline (chosen)**: Account-scoped rows + server-side checks everywhere + legacy internal owner + sign-in invites for read-only share.
- **Challenger (not chosen for v1)**: Public read-only links without account — faster sharing but weaker audit trail and more abuse surface; deferred.
