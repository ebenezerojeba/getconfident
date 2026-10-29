AI Impromptu Speaking Coach — Architecture

1. Product
   AI Impromptu Speaking Coach helps users improve public speaking, interviews, presentations,
   communication, confidence and thinking speed.
   Core loop:
   Choose Mode → Pick Topic → Prepare → Countdown → Record → Transcribe → Analyze →
   Review → Practice Again → Track Progress
   The most important product path is:
   Sign in → Start Practice → Pick Topic → Record → Finish → Receive AI Feedback

2. Stack
   Frontend
    Next.js 15
    App Router
    React 19
    TypeScript
    Tailwind CSS
    shadcn/ui
    Framer Motion
    React Hook Form
    Zod
    Zustand
    TanStack Query where useful

 Recharts or equivalent for analytics
Backend
 Next.js Route Handlers
 Server Actions where appropriate
 Prisma
 PostgreSQL via Neon
Services
 authentication
 OpenAI or compatible LLM
 Vercel AI SDK where useful
 UploadThing or secure object storage
 Upstash Redis
 Inngest for long-running/retryable jobs
 Resend where email is required
 Vercel deployment

3. Architecture Principles
   Feature-oriented structure
   src/
   ├── app/
   │ ├── (marketing)/
   │ ├── (auth)/
   │ ├── (dashboard)/
   │ ├── api/
   │ ├── layout.tsx
   │ └── globals.css

├── components/
│ ├── ui/
│ ├── layout/
│ └── shared/
├── features/
│ ├── topics/
│ ├── practice/
│ ├── recording/
│ ├── transcription/
│ ├── ai-coach/
│ ├── filler-analysis/
│ ├── follow-up/
│ ├── progress/
│ ├── achievements/
│ ├── history/
│ └── settings/
├── lib/
│ ├── auth/
│ ├── db/
│ ├── ai/
│ ├── storage/
│ ├── rate-limit/
│ ├── validation/
│ └── utils/
├── hooks/
├── stores/

├── types/
└── config/
Business logic should not be scattered through page components.

4. Server vs Client
   Use Server Components for:
    dashboard reads
    history
    reports
    profile/settings reads
    database-backed pages
    marketing/SEO pages
   Use Client Components for:
    camera/microphone
    MediaRecorder
    timer
    interactive charts
    interactive forms
    Zustand state
    browser-only APIs
    animations requiring client state
   Do not make an entire page client-side unnecessarily.

5. Authentication
   
   Browser

↓
Authenticated request
↓
Server-side authorization
↓
Application User
↓
Database
Rules:
 Never trust a client-supplied user ID.
 Resolve the authenticated user server-side.
 Authorize every user-owned resource.
 Users must never access another user&#39;s sessions, recordings, transcripts or reports.

6. Database
   Core conceptual relationships:
   User
   ├── PracticeSession
   │ ├── Recording
   │ ├── Transcript
   │ ├── SpeakingAnalysis
   │ └── FollowUpQuestion
   ├── TopicHistory
   ├── UserAchievement

└── UserPreferences

Topic
PracticeMode
Achievement
Use:
 proper foreign keys
 enums for controlled statuses
 timestamps
 indexes for frequent queries
 transactions for multi-write operations
 non-sequential public identifiers where appropriate

7. Session State
   Recommended lifecycle:
   DRAFT
   ↓
   READY
   ↓
   COUNTDOWN
   ↓
   RECORDING
   ↓
   PROCESSING
   ↓
   TRANSCRIBING

↓
ANALYZING
↓
COMPLETED
Explicit failure states:
PROCESSING_FAILED
TRANSCRIPTION_FAILED
ANALYSIS_FAILED
Recoverable failures should support retry without losing the original session.

8. Recording
   Browser-side media flow:
   Permission
   ↓
   Device detection
   ↓
   MediaRecorder
   ↓
   Blob
   ↓
   Secure upload
   ↓
   Recording metadata
   ↓
   Processing
   Validate:

 MIME type
 file size
 duration where available
 ownership
 upload authorization
Handle:
 permission denied
 missing camera
 missing microphone
 unsupported browser
 recording failure
 upload failure
Voice-only mode must reuse the same session pipeline and change only the media-capture
layer.

9. Transcription
   Use a provider-agnostic service:
   TranscriptionService
   ├── transcribe()
   ├── getStatus()
   └── normalizeResult()
   Normalized transcript should support:
    full text
    segments
    timestamps
    confidence where available

 word timestamps where available
 pause information
This supports filler timelines and speaking-speed calculations.

10. AI Coach
    AI Coach
    ↓
    Prompt Builder
    ↓
    LLM Provider
    ↓
    Structured Output
    ↓
    Zod Validation
    ↓
    Normalized Analysis
    ↓
    Database
    ↓
    Report UI
    AI analysis includes:
     clarity
     confidence
     grammar
     sentence structure
     vocabulary

 organization
 flow
 storytelling
 persuasiveness
 pace
 pauses
 filler words
 professionalism
 tone
 energy
 overall effectiveness
 strengths
 weaknesses
 suggestions
 examples
 grammar corrections
 confidence tips
 homework
 next recommendation
Never depend on unvalidated free-form AI output for application logic.

11. AI Accuracy Rules
    The AI must distinguish:
     observations supported by the transcript/audio/video
     reasonable inferences
     unavailable measurements

If video analysis is not actually implemented, do not invent an eye-contact or body-language
score.
Visual metrics should be nullable/unavailable until supported by a real analysis pipeline.

12. Filler Analysis
    Supported fillers:
     um
     uh
     like
     you know
     basically
     actually
     literally
     so
     kind of
     sort of
    Calculate:
     count
     percentage
     occurrences/minute
     timestamps when available
     trend across sessions
    Use phrase matching and word boundaries to reduce false positives. For example, every
    occurrence of “like” is not automatically a filler.

13. Practice Modes
    Make modes configuration-driven.

Conceptually:
PracticeMode
├── id
├── name
├── description
├── promptCategory
├── difficultyOptions
├── evaluationCriteria
└── followUpStyle
Modes:
 Interview
 Presentation
 Storytelling
 Debate
 Elevator Pitch
 Sales Pitch
 Networking
 Meeting Simulation
 Daily Speaking Challenge
Avoid separate duplicated implementations for each mode.

14. Follow-Up Questions
    Follow-up flow:
    Initial Answer
    ↓
    AI Follow-Up

↓
Voice/Text Answer
↓
Transcription if voice
↓
Evaluation
↓
Next Question
Maintain conversation context and enforce reasonable session limits.

15. Toastmasters-Style Evaluation
    Evaluate:
     introduction
     body
     conclusion
     transitions
     confidence
     eye contact when supported
     voice variety
     grammar
     timing
     audience engagement
     persuasiveness
     overall effectiveness
    Keep visual metrics optional until real video analysis exists.

16. Progress
    Derive progress from completed sessions.
    Metrics:
     sessions completed
     average score
     confidence trend
     grammar trend
     filler words reduction
     average pace
     total speaking time
     weekly trend
     monthly trend
     current streak
     longest streak
    Do not make permanent progress dependent solely on Zustand/client state.

17. Achievements
    Use deterministic, idempotent rules.
    Examples:
    FIRST_PRACTICE
    sessions &gt;= 1

SEVEN_DAY_STREAK
streak &gt;= 7

NO_FILLER_WORDS

fillerCount == 0

PERFECT_SCORE
overallScore == 100
Refreshing/retrying must not create duplicate achievements.

18. API Boundaries
    Use Server Actions for tightly coupled mutations when appropriate.
    Use Route Handlers for:
     external webhooks
     upload-related requests
     public/client API boundaries
     streaming
     external integrations
    Validate all external inputs with Zod.
    Possible endpoints:
    POST /api/topics
    POST /api/sessions
    POST /api/recordings
    POST /api/transcriptions
    POST /api/ai/analyze
    POST /api/follow-up
    GET /api/progress
    GET /api/history
    The exact API may change if a Server Action is cleaner.

19. Background Jobs
    Use Inngest when operations are long-running or retryable:
     transcription
     AI analysis
     weekly summaries
     achievement processing
     reminders/notifications
    UI should expose processing state and retry options.

20. State Management
    Server state:
     Server Components
     TanStack Query only when client-side server synchronization is useful
    Client state:
     Zustand for temporary UI/session state such as timer, practice configuration and
    recording UI
    Do not use Zustand as the permanent database.

21. Validation
    Use Zod for:
     forms
     query parameters
     server actions
     API bodies
     upload metadata
     AI output

 settings
Validation failures should produce useful user-facing messages.

22. Security
    Never expose:
     OpenAI keys
     database credentials
  
     Redis tokens
     storage credentials
    Implement:
     route protection
     resource authorization
     rate limiting
     file validation
     safe errors
     secret-safe logging
     webhook verification when applicable
     abuse controls for AI endpoints

23. UI/UX
    Visual direction:
     premium
     modern
     clean
     confident

 focused
 motivating
 responsive
 accessible
Use:
 rounded cards
 subtle gradients
 restrained glass effects
 clear typography
 meaningful motion
 skeleton states
 empty states
 error states
 success feedback
Support prefers-reduced-motion.
The practice screen must minimize distractions.

24. Core Practice UX
    Practice Setup
    ↓
    Choose Mode
    ↓
    Pick Topic
    ↓
    Choose Timer
    ↓

3-2-1 Countdown
↓
Recording Screen
↓
Finish
↓
Processing
↓
AI Report
Priority on recording screen:

1. Topic
2. Timer
3. Recording state
4. Controls
5. Minimal distractions

6. AI Report UX
   Recommended order:
7. Overall Score
8. What You Did Well
9. What To Improve
10. Speaking Metrics
11. Filler Words
12. Structure
13. Grammar
14. Delivery

15. Better Examples
16. Homework
17. Next Challenge
    Use progressive disclosure for detailed analysis.

18. Error Model
    Conceptual categories:
     ValidationError
     AuthenticationError
     AuthorizationError
     NotFoundError
     RateLimitError
     UploadError
     TranscriptionError
     AIAnalysisError
     DatabaseError
     ExternalServiceError
    Users receive actionable messages.
    Developers receive useful logs without secrets.

19. Testing
    Unit
     topic selection
     timer
     filler detection
     scoring

 streaks
 achievements
 schemas
 analytics
Integration
 authentication
 database
 sessions
 uploads
 transcription
 AI output validation
 follow-ups
 progress
 settings
 export/delete
E2E
Sign Up
↓
Dashboard
↓
Start Practice
↓
Pick Topic
↓
Record
↓

Finish
↓
Processing
↓
AI Report
↓
Progress Updated
↓
History

28. Deployment
    Target architecture:
    User
    ↓
    Vercel
    ↓
    Next.js
  
    ├── Neon PostgreSQL
    ├── OpenAI
    ├── UploadThing
    ├── Upstash Redis
    ├── Inngest
    └── Resend
    Use separate production credentials/data where appropriate.

29. Environment Variables
    Create .env.example:
    DATABASE_URL=
    DIRECT_URL=


OPENAI_API_KEY=

BLOB_READ_WRITE_TOKEN=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

RESEND_API_KEY=
RESEND_FROM_EMAIL=
Never commit real credentials.

30. Development Order
1. Foundation
1. Design system
1. Authentication

1. Database
1. Landing page
1. Dashboard
1. Topic generator
1. Practice/timer
1. Recording
1. Voice mode
1. Transcription
1. AI coach
1. Filler analysis
1. Practice modes
1. Follow-up questions
1. Toastmasters evaluation
1. Progress
1. Achievements
1. History
1. Settings
1. Notifications
1. Security hardening
1. Testing
1. Performance/accessibility
1. Deployment
   Do not skip ahead without a verified reason.

1. Critical Product Rule

If production AI credentials are unavailable during early development, use a clearly isolated
local mock provider only for development/testing.
Do not call mock output production functionality.
Do not mark AI integration complete until the real provider has been tested.

32. Architecture Change Rule
    When a better architecture is discovered:
1. Stop before a large structural change.
1. Explain why.
1. Update this file.
1. Update SCRATCHPAD.md.
1. Add a lesson to LESSONS.md if it resulted from an error/compatibility discovery.
1. Implement the change.
1. Re-run relevant tests.

33. As-Built Decisions (2026-09-19)
    These record where the implementation refines the plan above, and why.

    33.1 Phase order: database before authentication
    Manual authentication needs User and AuthSession tables, so the Prisma/PostgreSQL
    foundation (Phase 3) was built first, then authentication (Phase 2) on top of it.

    33.2 Stack versions
    Next.js 15.5 (App Router), React 19.1, TypeScript 5.9, Tailwind CSS 4, shadcn/ui
    (radix-nova preset, `cn` package), framer-motion 13, Zod 4, react-hook-form 7,
    Zustand 5, Recharts 3, Prisma 7.10 with @prisma/adapter-pg (driver adapter; generated
    client in src/generated/prisma), Vitest 5, Playwright 1.63. Fonts are self-hosted via
    the `geist` package so builds never depend on network font downloads.

    33.3 Authentication (manual, no third-party auth)
    - Passwords: Argon2id via @node-rs/argon2 (19 MiB, t=2, p=1), NFKC-normalized.
      Unknown emails still run a hash verification (timing equalization).
    - Sessions: 256-bit random token in an HttpOnly, SameSite=Lax cookie (Secure and
      `__Host-` prefixed in production). The database stores HMAC-SHA256(AUTH_SECRET,
      token) as AuthSession.id, never the token itself.
    - Expiry: 30 days, sliding. The DB expiry is extended server-side when <15 days remain.
      Cookies are re-issued by middleware on full page loads and by API route handlers.
      Middleware does NOT re-issue on RSC/server-action requests: after sign-out, a server
      action's internal redirect render still carries the old cookie.
    - Password change invalidates all other sessions. "Sign out other devices" exists.
    - Middleware is only an optimistic gate (cookie presence) plus a CSRF Origin check for
      state-changing /api requests. Every page, action and route handler re-validates the
      session server-side (src/lib/auth/current-user.ts, src/lib/api.ts withUser).
    - Ownership: user-owned rows are always queried with `userId` from the session;
      another user's resource returns 404 (not 403) so existence isn't revealed.
    - Rate limiting: fixed-window counters in PostgreSQL (RateLimitBucket) through one
      atomic upsert. Upstash can replace this behind the same interface. Sign-in is limited
      per IP and per email; sign-up per IP; password change, uploads, AI and topics per user.

    33.4 AI and transcription providers
    No AI SDK dependency: src/lib/ai/openai.ts calls the OpenAI REST API with fetch
    (timeouts, retries with backoff on 429/5xx, safe error mapping). Structured output uses
    strict JSON schema generated from Zod (z.toJSONSchema), then:
      raw LLM JSON → llmReportSchema (loose) → normalizeReport() → coachReportSchema (strict)
    Pace, pauses and filler-word scores are overridden with deterministic measurements.
    Eye contact is always "unavailable" (no video analysis exists). Transcription uses
    whisper-1 verbose_json (segment + word timestamps).
    AI_PROVIDER=mock selects an isolated, clearly labelled dev/test provider. It refuses to
    run when NODE_ENV=production unless ALLOW_MOCK_AI_IN_PRODUCTION=1, which is set only by
    the Playwright E2E server.

    33.5 Background processing
    Upload returns 202, then processing (transcribe → analyze → complete → achievements) runs
    via next/server `after()` with maxDuration=300. Every step is a guarded conditional state
    transition, so retries and concurrent runs are idempotent. The UI polls
    GET /api/sessions/[id]. Inngest can replace `after()` without changing the service layer
    (processSession is already idempotent and resumable).

    33.6 Recording storage and upload limits
    StorageDriver interface (src/lib/storage). Local filesystem driver for development and
    tests. Video sessions also record a separate compact audio-only track (used for
    transcription, under the 25 MB provider limit). Media is served only through
    /api/recordings/[sessionId] with an ownership check and Range support; there are never
    public URLs.
    Vercel functions cap request and response bodies at ~4.5 MB. Recordings up to 4 MB in
    total go through the server (multipart form). Larger ones, with STORAGE_DRIVER=blob, are
    uploaded by the browser straight to private Vercel Blob storage (this needs
    BLOB_READ_WRITE_TOKEN; a store connected only via OIDC/BLOB_STORE_ID can't issue
    browser upload tokens). Without that token, or if the direct upload fails, large
    recordings upload through the server in 3.5 MB parts (POST /api/sessions/[id]/recording-chunk)
    and are joined into one file on submit. Direct-upload details: POST /api/sessions/[id]/upload-token
    issues a short-lived token locked to one pathname in the user's session folder (type and
    size limits included), then POST /api/sessions/[id]/recording with a JSON body attaches
    the files after re-checking size, type and magic bytes (bad files are deleted). The
    multipart form upload remains for the local driver. Playback streams 206 partial
    responses of at most 4 MB each. Follow-up answers still go through the function and are
    capped client-side at 4 MB (~8 minutes of voice).

    33.7 Local database for development and tests
    No Docker is required: scripts/db-local.mjs runs a real PostgreSQL 18 server via
    `embedded-postgres` (port 54329, TimeZone=UTC to match Neon). Integration tests use the
    separate `commcoach_test` database, apply migrations with `migrate deploy`, and isolate
    themselves with unique per-run data (no destructive resets).

    33.8 Production readiness (what is still required to go live)
    The application is feature-complete and verified locally, but these items need
    credentials or a deployment target and are marked [!] in PROJECT_PROGRESS.md:

    a) AI provider. DONE for development (2026-09-21), verified against Groq:
       AI_PROVIDER=openai, OPENAI_BASE_URL=https://api.groq.com/openai/v1,
       OPENAI_MODEL=openai/gpt-oss-120b, OPENAI_TRANSCRIPTION_MODEL=whisper-large-v3.
       Verified live: strict JSON-schema analysis (npm run verify:ai), Whisper
       transcription with word timestamps, and one full browser session recording real
       speech (e2e/live-session.spec.ts). Note gpt-oss-20b truncates this report and other
       Groq models ignore strict mode. For production, either keep Groq (check its free
       tier data-retention terms for user speech) or set OPENAI_API_KEY with no base URL
       to use OpenAI directly.
    b) Database. Create a Neon project; set DATABASE_URL (pooled) and DIRECT_URL
       (direct, used by Prisma Migrate). Production deploys run `prisma migrate deploy` and
       the idempotent seed automatically (scripts/vercel-build.mjs); previews skip both.
    c) Storage. STORAGE_DRIVER=local is development-only and refuses to run on Vercel.
       DONE (2026-09-28): STORAGE_DRIVER=blob uses a private Vercel Blob store
       (src/lib/storage/blob.ts; token BLOB_READ_WRITE_TOKEN). Account deletion removes
       the user's objects by prefix (StorageDriver.deletePrefix). DONE (2026-10-27):
       recordings upload directly from the browser to Blob and playback is chunked, so
       the ~4.5 MB function body limit no longer applies (see 33.6).
    d) Email. Set RESEND_API_KEY and RESEND_FROM_EMAIL; without them the app logs emails
       instead of sending them. Verify the sending domain before enabling reminders.
    e) Scheduled jobs. Set CRON_SECRET; vercel.json already schedules the hourly
       /api/cron/notifications job.
    f) Rate limiting at scale. The PostgreSQL fixed-window limiter is correct and atomic;
       swap in Upstash Redis behind the same interface if write volume becomes an issue.
    g) Monitoring. Structured JSON logs (src/lib/logger.ts, secret-redacting) are emitted
       for log drains. Add an error-tracking service (e.g. Sentry) if required.
    h) Backups and rollback. Neon provides point-in-time restore; enable it and record the
       retention window. Vercel keeps immutable deployments, so rollback is a promotion of
       the previous deployment. Migrations are forward-only: pair any destructive migration
       with a tested restore plan.
    i) Known dependency advisory. next@15.5.25 bundles a vulnerable postcss; the only
       offered fix is next@16 (a breaking major outside this project's stated stack).
       postcss runs at build time over first-party CSS only. Re-evaluate when moving to
       Next 16.

    33.8b Password reset and legal pages
    /forgot-password emails a one-hour reset link (Resend; in development the link is logged).
    Tokens are HMAC-signed with AUTH_SECRET over the user's current password hash, so they are
    not stored and stop working once the password changes (single use). Requests always get
    the same response and the email is sent after responding, so they don't reveal which
    emails have accounts. A reset signs the user out everywhere. /privacy and /terms are
    static pages (listed in the middleware's STATIC_PAGES); NEXT_PUBLIC_CONTACT_EMAIL sets
    the contact address shown on them.

    33.9 Content Security Policy
    Middleware emits a CSP per request. Dynamically rendered routes get a nonce
    ('strict-dynamic'), which Next applies to its own scripts and which is forwarded to
    next-themes' inline bootstrap through the per-group providers (src/app/nonce-providers.tsx).
    Statically prerendered pages (/ and /styleguide) cannot carry a per-request nonce, so
    they fall back to 'unsafe-inline' scripts; they render no user data and no
    user-generated content. This is why Providers live in route-group layouts rather than
    the root layout: reading headers() in the root layout would force every route, including
    the landing page, to render dynamically.
