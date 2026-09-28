# Comm Coach — AI Impromptu Speaking Coach

Practice impromptu speaking against a random topic and a timer, then get instant, specific AI
coaching on clarity, structure, confidence, pace and filler words.

Core loop: **choose a mode → get a topic → 3-2-1 → record → transcribe → analyze → review →
practice again → track progress.**

## Stack

| Area        | Choice                                                                     |
| ----------- | -------------------------------------------------------------------------- |
| Framework   | Next.js 15 (App Router), React 19, TypeScript                               |
| UI          | Tailwind CSS 4, shadcn/ui (radix-nova), framer-motion, Recharts             |
| Data        | PostgreSQL + Prisma 7 (driver adapter `@prisma/adapter-pg`)                 |
| Auth        | Built in-house: Argon2id + database-backed sessions (no third-party auth)   |
| AI          | OpenAI REST via `fetch` (no SDK), strict JSON-schema structured output      |
| Testing     | Vitest (unit + integration), Playwright (E2E, a11y, performance)            |

## Getting started

```bash
npm install                 # postinstall runs `prisma generate`
cp .env.example .env        # fill in AUTH_SECRET at minimum (see below)
npm run db:start            # local PostgreSQL (no Docker needed) on port 54329 — keep running
npm run db:deploy           # apply migrations
npm run db:seed             # 189 topics + 9 achievements
npm run dev                 # http://localhost:3000
```

Generate a secret for `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Without `OPENAI_API_KEY`, set `AI_PROVIDER=mock`: transcription and coaching then use an isolated,
clearly-labelled development provider so the whole flow works offline. Mock output is never
presented as real coaching, and the mock provider refuses to run in production.

## Scripts

| Script                     | What it does                                                       |
| -------------------------- | ------------------------------------------------------------------ |
| `npm run dev`              | Development server                                                  |
| `npm run db:start`         | Local PostgreSQL via `embedded-postgres` (data in `.data/postgres`)  |
| `npm run db:migrate`       | Create a migration from schema changes                              |
| `npm test`                 | Unit tests (Vitest)                                                 |
| `npm run test:integration` | Integration tests against a real database (needs `db:start`)        |
| `npm run test:e2e`         | Playwright E2E (builds to `.next-build`, serves on port 3100)       |
| `npm run test:all`         | Everything, in the order CI runs it                                 |

E2E builds into `.next-build` (`NEXT_DIST_DIR`) so it can run while `npm run dev` is using `.next`.

## Architecture in one page

```
src/
├── app/                  routes: (marketing) (auth) (app) onboarding api
├── components/           ui (shadcn), layout, shared
├── features/             topics practice recording transcription ai-coach
│                         filler-analysis follow-up progress achievements
│                         history settings notifications auth onboarding marketing
├── lib/                  auth db ai email storage rate-limit validation api utils
├── stores/  hooks/  config/  generated/prisma
```

Rules that matter:

- **Business logic lives in `features/*`**, not in page components.
- **Never trust the client for identity.** Every page, action and route handler resolves the user
  from the session cookie server-side; user-owned rows are queried with that id, and someone else's
  resource returns 404.
- **Validate everything external with Zod** — form input, API bodies, query params, and AI output.
- **AI output is never trusted raw.** Model JSON is parsed loosely, normalized, then validated
  against a strict schema. Pace, pauses and filler scores are overridden with deterministic
  measurements, and unavailable metrics (eye contact) stay `unavailable` instead of being invented.

`ARCHITECTURE.md` has the full design, including the as-built decisions (section 33).
`LESSONS.md` records compatibility findings and debugging lessons — read it before changing
dependencies or the toolchain.

## Testing

- **Unit** (`src/**/*.test.ts`) — pure logic: timer, filler detection, analytics, streaks,
  achievement rules, schemas, validation.
- **Integration** (`tests/integration`) — real PostgreSQL: auth, sessions, uploads, the
  transcribe→analyze pipeline, rate limiting, notifications, the OpenAI client (mocked `fetch`).
  Non-destructive by design: migrations are applied with `migrate deploy` and every test uses
  unique per-run data.
- **E2E** (`e2e/`) — full flows in Chromium with synthetic camera/microphone, plus axe
  accessibility audits, CSP/security checks and Core Web Vitals.

## Deployment

Target is Vercel + Neon. Before going live, see "Production readiness" in `ARCHITECTURE.md` §33.8:
production credentials, an object-storage driver (the local filesystem driver refuses to run on
Vercel), and direct-to-storage uploads for video, which exceed the 4.5 MB serverless body limit.
`vercel.json` schedules the hourly notification cron (`/api/cron/notifications`, protected by
`CRON_SECRET`).
