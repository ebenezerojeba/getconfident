AI Impromptu Speaking Coach — Scratchpad
Active working memory for the coding agent.
STRICT: Read this file before planning the next task. Update it after every meaningful subtask
and milestone.
Rules

1. Plan before coding.
2. Work on one feature slice at a time.
3. Never build the whole product in one pass.
4. Use [X] completed, [ ] pending, [~] in progress, [!] blocked.
5. Never mark [X] until implementation and verification are complete.
6. Inspect existing files before modifying them.
7. Never delete user files without permission.
8. When a command fails, diagnose the root cause before retrying.
9. Never repeatedly run a failing command without changing the cause.
10. Keep the app runnable throughout development.
11. Use stable, compatible dependency versions.
12. Do not install unnecessary packages.
13. Keep secrets in environment variables.
14. Validate external/user input with Zod.
15. Keep AI provider, transcription, storage, and recording integrations behind service
    boundaries.
16. Do not expose private API keys to the browser.
17. Update PROJECT_PROGRESS.md immediately after a task changes status.
18. Record reusable mistakes/corrections in LESSONS.md.
19. Record architecture decisions in ARCHITECTURE.md.

20. If blocked by credentials/external configuration, mark [!], explain exactly what is
    needed, and continue with independent work where possible.
21. After each milestone, run relevant tests.
22. If an architectural improvement is discovered, document it before implementing the
    change.
23. Never claim the application is live unless the development server or deployed URL has
    actually been verified.
24. Prioritize a minimal working end-to-end path before optional polish.
    Current Objective
    Build and launch a production-quality Next.js web application for AI-powered impromptu
    speaking practice.
    Current Phase
    Phases 0-23 complete and verified. The AI provider is now live (Groq): Phases 10, 11
    and 14 were closed on 2026-09-21 after a real transcription + analysis run.
    Phase 24 (deployment) remains blocked on a deployment target and production services;
    see ARCHITECTURE.md 33.8. Phase 8 keeps one [!]: recording on real mobile browsers
    cannot be verified from this machine.

    Local development quick start
    1. npm install            (postinstall runs prisma generate)
    2. npm run db:start       (real PostgreSQL via embedded-postgres on port 54329; keep running)
    3. npm run db:deploy && npm run db:seed
    4. npm run dev
    Tests: npm test (unit) - npm run test:integration (needs db:start) - npm run test:e2e
    Live AI: npm run verify:ai  (real provider; add SAMPLE_AUDIO=... to check transcription)
    Live session: npm run tts:sample, then
      E2E_AI_PROVIDER=openai npx playwright test e2e/live-session.spec.ts
    E2E builds into .next-build (NEXT_DIST_DIR) so it can run alongside npm run dev.
    The local database MUST be UTF8 (npm run db:start warns otherwise): real AI output
    contains characters WIN1252 cannot store. Fix with npm run db:recreate -- <name>.

    What is built
    - Landing page (static, SEO + OG image), manual auth, onboarding, profile and security
    - Practice: 10 configuration-driven modes, 189 seeded topics, filters, daily challenge
    - Session runner: 3-2-1 countdown, 6 timer lengths, pause/resume/restart/finish,
      camera or voice-only recording, review, retake/delete, upload with progress + retry
    - Pipeline: transcription -> deterministic metrics -> AI coach -> normalized report;
      every step is a guarded state transition with retry
    - Report: 16 dimensions with evidence basis, filler timeline, Toastmasters evaluation,
      better wording, homework, next challenge, transcript with highlighted fillers,
      recording playback, follow-up conversation (3 spoken question/answer turns)
    - Dashboard, progress (charts + date ranges), history (search/filter/paginate),
      achievements, settings (preferences, theme, notifications, privacy, export, delete)
    - Security: CSP with nonces, CSRF origin checks, rate limiting, ownership checks
    - Notifications: in-app bell + reminder/summary/achievement emails via hourly cron

    Current Task
     [X] Phases 0-23
     [X] Live AI provider verified (Groq: gpt-oss-120b + whisper-large-v3)
     [!] Phase 24 deployment: needs Neon, object storage, Resend, Vercel
     [ ] Next smallest verified task: decide the production AI provider (keep Groq or
         switch to OpenAI) and implement an object-storage StorageDriver, since the local
         filesystem driver refuses to run on Vercel.
