# dwellchecker

Buyer-first property condition intelligence. Score risk, interpret inspection reports, and get a clear proceed-negotiate-walk recommendation.

## Stack

- Next.js 15 App Router (TypeScript, React Server Components)
- Prisma + PostgreSQL (Neon recommended via Vercel Marketplace)
- Vercel Blob for inspection file storage
- Zod for boundary validation
- Vercel Functions (Fluid Compute) for API + ingestion

## Getting started

```bash
npm install
cp .env.example .env
```

Fill in:

- **Clerk** — [Create an application](https://dashboard.clerk.com/) and add `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (required for `npm run dev` / `npm run build`).
- **Database** — `DATABASE_URL` and `POSTGRES_URL_NON_POOLING` (matches `prisma/schema.prisma` `directUrl`; Neon on Vercel sets these).
- **Blob** — `BLOB_READ_WRITE_TOKEN` for inspection uploads.

Apply the schema (prefer migrations in production):

```bash
npx prisma migrate deploy
# or local dev: npx prisma migrate dev
npm run dev
```

Open http://localhost:3000. Sign in to use the dashboard; property data is scoped to the signed-in user, with optional read-only sharing by email.

### Legacy rows (existing databases)

If you already have `Property` rows from before ownership was added, the migration sets `ownerUserId` to `legacy-unassigned`. Replace that with your real Clerk user id for the designated internal account (one-time SQL), for example:

```sql
UPDATE "Property" SET "ownerUserId" = 'user_xxxxxxxx' WHERE "ownerUserId" = 'legacy-unassigned';
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project at https://vercel.com/new.
3. From the Vercel dashboard, add a Postgres database via the Marketplace
   (Neon recommended). The integration auto-provisions `DATABASE_URL` and
   `DIRECT_URL`.
4. Add a Vercel Blob store. The integration auto-provisions
   `BLOB_READ_WRITE_TOKEN`.
5. Set `NEXT_PUBLIC_APP_URL` to the production URL, plus
   `INTERNAL_JOB_SECRET` and `CRON_SHARED_SECRET`.
6. Deploy. The first build runs `prisma generate && next build`. Run
   `npx prisma db push` against the production DB once to create tables
   (or wire up `prisma migrate deploy` in CI).

## Architecture

```
app/                  Next.js routes (UI + API)
components/           UI components (server-first, client where needed)
lib/
  db/                 Prisma client
  domain/             Property, profile assembly
  ingestion/          Intake → extract → parse pipeline
  normalization/      Raw findings → canonical defects, dedupe
  scoring/            Decision engine + profile recompute
  storage/            Vercel Blob wrapper
  logging/            Structured JSON logger
  env.ts              Zod-validated env access
prisma/schema.prisma  Canonical data model
types/                Shared Zod + TS contracts
```

The canonical entity is `PropertyConditionProfile`. Everything writes to
or reads from this object — see `docs/02-system-architecture.md` in the
spec bundle.

## API surface

All routes below require a signed-in session except the internal worker.

- `POST /api/properties/upsert` — create/find a property **for the current user** by address (per-owner dedupe)
- `GET  /api/properties/:id` — fetch property + profile + defects if the user **owns** the property or has **read-only share** access
- `POST /api/properties/:id/shares` — owner only: invite read-only access by email (`{ "email": "..." }`)
- `POST /api/properties/:id/preanalyze` — **owner** only: recompute the profile
- `POST /api/properties/:id/uploads` — **owner** only: upload an inspection (multipart)
- `GET  /api/ingestion/jobs/:id` — poll job status if you can read the related property
- `POST /api/ingestion/jobs/:id/process` — internal worker (secret-gated, no session)

All boundaries validate with Zod and return a consistent error envelope.

## Roadmap

- Real PDF text extraction (currently a stub that handles text/json bodies)
- Operator review queue for low-confidence normalizations
- Multi-property comparison with weighted dimensions
