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
# fill in DATABASE_URL, DIRECT_URL, BLOB_READ_WRITE_TOKEN
npx prisma db push
npm run dev
```

Open http://localhost:3000.

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

- `POST /api/properties/upsert` — create/find a property by address
- `GET  /api/properties/:id` — fetch property + profile + defects
- `POST /api/properties/:id/preanalyze` — recompute the profile
- `POST /api/properties/:id/uploads` — upload an inspection (multipart)
- `GET  /api/ingestion/jobs/:id` — poll ingestion status
- `POST /api/ingestion/jobs/:id/process` — internal worker (secret-gated)

All boundaries validate with Zod and return a consistent error envelope.

## Roadmap

- Real PDF text extraction (currently a stub that handles text/json bodies)
- Auth (Clerk via Vercel Marketplace)
- Operator review queue for low-confidence normalizations
- Multi-property comparison with weighted dimensions
