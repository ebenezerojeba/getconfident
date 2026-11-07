# How GetConfident works

A plain-English tour of the architecture, written so you can explain it out loud,
whether to a friend, an investor or an engineer in an interview. Start with the
short version, then go as deep as the conversation needs.

---

## The 30-second version

> GetConfident is a web app that helps people practise speaking. You get a random topic,
> speak to your camera or microphone, and within seconds an AI coach gives you a score and
> specific feedback on clarity, confidence, structure and filler words.
>
> It's one **Next.js** app written in **TypeScript**, deployed on **Vercel**. Data lives in a
> **PostgreSQL** database (hosted on **Neon**) accessed through **Prisma**. Recordings go to
> **Vercel Blob** storage. Speech is transcribed with **Whisper**, and a **large language
> model** writes the coaching report. Both are called through an OpenAI-compatible API (currently
> Groq). I built authentication myself instead of using a service like Clerk. Everything is
> covered by unit, integration and end-to-end browser tests that run on every push.

## The 2-minute version: the big picture

```
   ┌───────────────────────────── Browser ─────────────────────────────┐
   │  React pages · camera/mic recording · live pace & filler meter    │
   └───────┬──────────────────────────────┬────────────────────────────┘
           │ pages & API calls            │ recording upload (direct)
           ▼                              ▼
   ┌──────────────────────┐        ┌──────────────────┐
   │  Next.js on Vercel   │───────▶│   Vercel Blob    │  private files
   │  - pages (server)    │        └──────────────────┘
   │  - API routes        │
   │  - background work   │───────▶ Whisper (speech → text)
   │  - hourly cron job   │───────▶ LLM (text → coaching report)
   └─────────┬────────────┘───────▶ SMTP email (reminders, resets)
             │ Prisma
             ▼
   ┌──────────────────────┐
   │ PostgreSQL (Neon)    │  users, sessions, transcripts, scores…
   └──────────────────────┘
```

There is **one codebase and one deployable app**. The frontend and backend live together in
Next.js: pages render on the server, and the same project exposes the API endpoints the
browser calls. That keeps it simple to run, test and deploy.

---

## The tech stack, and why each piece is there

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router) + **React 19** | Frontend and backend in one project; server rendering for speed and SEO |
| Language | **TypeScript** (strict) | Catches mistakes before they reach users |
| Styling | **Tailwind CSS** + **shadcn/ui** (Radix) components | Fast to build, consistent, accessible by default |
| Forms & validation | **React Hook Form** + **Zod** | The same Zod rules validate data in the browser *and* on the server |
| Database | **PostgreSQL** on **Neon** (serverless) | Reliable relational data; scales to zero when idle |
| Database access | **Prisma** ORM + migrations | Type-safe queries; schema changes are versioned files |
| File storage | **Vercel Blob** (private) | Large video files upload straight from the browser |
| Speech to text | **Whisper** (`whisper-large-v3`) | Accurate transcripts with word timings |
| AI coach | LLM via an **OpenAI-compatible API** (Groq) | Swappable: change one environment variable to use another provider |
| Email | **Nodemailer** over SMTP | Works with any email provider |
| Charts | **Recharts** | Progress graphs |
| Hosting | **Vercel** (+ Vercel Cron) | Deploys automatically from GitHub |
| Testing | **Vitest**, **Testing Library**, **Playwright**, **axe** | Unit, integration, real-browser and accessibility tests |
| CI | **GitHub Actions** | Runs lint, type-check, every test suite and a build on each push |

---

## Follow one practice session through the system

This is the best story to tell, because it touches every part of the app.

1. **Pick a topic.** The server picks a random topic for the chosen mode (interview,
   presentation, everyday…) and difficulty, avoiding ones you've seen recently
   (`features/topics`). A `PracticeSession` row is created with status `READY`.

2. **Prepare and count down.** A timer runs in the browser. Each step is a state in a
   small **state machine** (`features/practice/state-machine.ts`):
   `READY → COUNTDOWN → RECORDING → PROCESSING → TRANSCRIBING → ANALYZING → COMPLETED`.
   The server enforces the same transitions, so the UI can never skip a step or end up
   in an impossible state.

3. **Record.** The browser's **MediaRecorder** API captures camera and/or microphone.
   While you speak, the **live coach** uses the browser's built-in speech recognition to show
   your pace (words per minute) and flag filler words ("um", "like") in real time. This runs
   entirely on your device and costs nothing.

4. **Upload.** The recording uploads **directly from the browser to private Vercel Blob
   storage**. The server first issues a one-time upload token locked to that user's own
   folder, so nobody can write into someone else's space. Going direct also avoids the
   ~4.5 MB request limit on serverless functions. Big files are split into parts and retried.

5. **Process in the background.** The API replies "202: processing" immediately, then
   uses Next.js's `after()` to keep working once the response has gone:
   - **Transcribe** the audio with Whisper → save a `Transcript`.
   - **Measure** speaking pace and count filler words with my own analysis code
     (`features/filler-analysis`). This is plain code, not AI, so it's exact and repeatable.
   - **Coach.** Send the transcript plus those measurements to the LLM with a carefully written
     prompt. It must reply in a strict JSON shape, which is checked with Zod and retried once
     if it's malformed. Save it as a `SpeakingAnalysis`.

   If a step fails, the session moves to a specific failure state (for example
   `TRANSCRIPTION_FAILED`) with a friendly reason, and the user can press **Retry**. Nothing
   is lost.

6. **Review.** The report page shows an overall score, scores for clarity, confidence,
   structure and delivery, your transcript with filler words highlighted, and concrete tips.
   You can share a **results image** that is generated on the server and shows scores only,
   never your recording.

7. **Follow-up questions (interview mode).** The AI plays an interviewer and asks
   follow-up questions about what you said. They're read aloud with the browser's
   text-to-speech, you answer out loud, and each answer gets its own feedback.

8. **Progress.** Streaks, charts, achievements ("first session", "7-day streak"…) and
   in-app notifications update automatically.

---

## How the code is organised

```
src/
├── app/                 Pages and API routes (Next.js App Router)
│   ├── (marketing)/     Public pages: home, privacy, terms
│   ├── (auth)/          Sign in, sign up, password reset
│   ├── (app)/           Signed-in app: dashboard, practice, history, progress, settings
│   └── api/             JSON endpoints: sessions, uploads, topics, cron, account export
├── features/            Business logic, grouped by feature
│   ├── practice/        Session lifecycle, state machine, daily limit
│   ├── recording/       Camera/mic, uploads, live coach
│   ├── transcription/   Whisper integration + speech metrics
│   ├── ai-coach/        Prompt, report schema, report UI
│   ├── filler-analysis/ Filler-word detection (pure code, unit tested)
│   ├── follow-up/       AI interviewer questions
│   ├── progress/, achievements/, notifications/, topics/, history/, settings/ …
├── lib/                 Shared infrastructure
│   ├── auth/            Passwords, sessions, cookies, current user
│   ├── db/              Prisma client
│   ├── ai/              AI provider selection + OpenAI-compatible client
│   ├── storage/         Vercel Blob (and a local-disk driver for development)
│   ├── rate-limit/      Postgres-backed rate limiting
│   └── email/           SMTP client + email templates
├── components/          Reusable UI: buttons, cards, dialogs, logo, navigation
└── proxy.ts             Runs before every request: redirects, CSRF check, security headers
prisma/schema.prisma     The database design
e2e/  tests/             Browser tests and integration tests
```

**The rule I followed:** pages stay thin. A page or API route checks who the user is,
validates input, then calls a function in `features/`. That's where the logic lives, and
that's what the tests exercise.

**Server vs client:** most pages are **React Server Components**. They read the database
directly on the server and send finished HTML, so they're fast and keep data private. Only
interactive parts (recorder, timer, charts, forms) run as client components in the browser.

---

## The database

The main tables (Prisma models):

- **User**, **UserPreferences**: account, goal, time zone, theme, notification settings
- **AuthSession**: logged-in devices (stores only a *hash* of each login token)
- **Topic**, **TopicHistory**: the topic bank, and which topics each user has seen
- **PracticeSession**: one attempt: mode, topic, status, timings
- **Recording**, **Transcript**, **SpeakingAnalysis**: the recording file reference, the
  words spoken, and the AI report with scores
- **FollowUpQuestion**: interviewer questions and the answers to them
- **Achievement**, **UserAchievement**, **Notification**: gamification and the bell icon
- **RateLimitBucket**: counters for rate limits and the daily session cap

Every user-owned query is filtered by the signed-in user's ID, which the server works out
itself. The browser can never just *say* who it is.

---

## Authentication (built by hand, no Clerk)

- **Passwords** are hashed with **Argon2id**, the current recommended algorithm. When an email
  isn't registered, the server still spends the same time checking, so attackers can't tell
  which emails have accounts by timing the response.
- **Sessions:** on sign-in the server creates a random token and puts it in an
  **HttpOnly, Secure, SameSite** cookie, which JavaScript can't read. The database stores only a
  **keyed hash (HMAC-SHA-256)** of the token, so a leaked database can't be used to log in. Sessions extend
  while you're active and expire when you're not.
- **Password reset** links are signed (HMAC), expire after an hour and work only once,
  because they're tied to the current password hash.
- **Rate limits** on sign-in, sign-up, resets, uploads and AI calls are stored in Postgres,
  so they hold across all servers.

## Security

- **Content Security Policy:** each request gets a fresh random *nonce*, and the browser only
  runs scripts carrying it. This blocks injected scripts (XSS).
- **CSRF protection:** `proxy.ts` rejects state-changing requests that come from another website.
- **Security headers:** `nosniff`, `DENY` framing, strict referrer policy, camera/mic
  allowed only on this site.
- **Validation:** every request body is checked with Zod; errors never leak internal details.
- **Cost control:** a **daily session cap** (15 by default) stops one account from running
  up the AI bill.
- **Privacy:** users can export all their data as JSON or delete their account and
  recordings completely.

## Background work, email and the installable app

- **`after()`** runs the transcription and analysis once the upload response has been sent.
- A **Vercel Cron** job calls `/api/cron/notifications` every hour. It checks each user's
  *local* time and sends practice reminders and weekly summaries at sensible hours. It's
  protected by a secret.
- **Emails** go out through any SMTP provider via Nodemailer.
- The app is a **PWA**: it has a manifest and icons, so people can "install" it to their
  phone's home screen.

## Swappable AI provider

All AI calls go through one small layer (`lib/ai`). Switching provider (OpenAI, Groq, or
any OpenAI-compatible service) means changing environment variables, not code. There's
also a **mock provider** for tests, so the full test suite runs without paying for AI calls.
It's blocked from running in production.

## Testing and quality

| Kind | Tool | What it proves |
| --- | --- | --- |
| Unit | Vitest | Pure logic: filler detection, scoring, streaks, state machine, timers |
| Component | Testing Library | UI pieces render and behave correctly |
| Integration | Vitest + real Postgres | Services work against a real database (auth, limits, practice) |
| End-to-end | Playwright (real Chromium, fake camera/mic) | Whole user journeys: sign up → record → get feedback → share |
| Accessibility | axe-core | No contrast or screen-reader problems on key pages |
| Security | Playwright | Headers, CSP, CSRF and auth protection actually work |

GitHub Actions runs **lint → type-check → unit → integration → build → end-to-end** on every
push, against a fresh Postgres database.

---

## Questions people often ask, and good answers

**"Why one Next.js app instead of a separate frontend and backend?"**
It's a small team (me), and the app's data needs are simple. One codebase means shared
types and validation, one deployment and fewer moving parts. The logic sits in `features/`,
so it could be split into a separate service later if needed.

**"How do you handle big video uploads on serverless?"**
They never go through my server. The browser uploads straight to Blob storage with a
short-lived token scoped to the user's folder. The server only receives the file's location.

**"What if the AI fails or returns rubbish?"**
The model must return a strict JSON shape, which is validated with Zod and retried once.
Numbers like filler count and pace come from my own code, not the AI, so they're always
accurate. Failures become a clear "retry" state instead of a broken page.

**"Why build your own auth?"**
To understand it fully and avoid a paid dependency. It follows current best practice:
Argon2id hashing, hashed session tokens, HttpOnly cookies, rate limiting, signed one-time
reset links, and it's covered by tests.

**"How do you stop abuse and runaway AI costs?"**
Per-user and per-IP rate limits stored in Postgres, plus a daily cap on practice sessions.

**"How do you know it works?"**
More than 200 unit tests, integration tests against a real database and about 80 browser
tests run automatically on every change, including accessibility and security checks.

**"What would you add next?"**
Payments (for example a Pro plan with more daily sessions), error monitoring (for example
Sentry), and a job queue for processing if traffic grows.
