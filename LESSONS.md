AI Impromptu Speaking Coach — Lessons
Persistent record of mistakes, fixes, compatibility findings, and reusable engineering rules.
Rule: Read this before introducing dependencies or repeating a failed approach.
Core Rules

1. Prefer official documentation and stable versions compatible with the project&#39;s Next.js
   version.
2. Keep the app runnable after every milestone.
3. Code existence does not equal feature completion.
4. Fix root causes rather than repeatedly retrying failed commands.
5. Inspect package versions/configuration before changing the toolchain.
6. Keep real secrets out of source control.
7. Use .env.example for required environment variables.
8. Validate user/external input with Zod.
9. Keep AI calls server-side.
10. Never expose private AI credentials to client components.
11. Keep AI provider code behind an abstraction.
12. Keep transcription provider code behind an abstraction.
13. Keep media recording logic separate from session business logic.
14. Do not claim visual metrics such as eye contact/body language unless actual video
    analysis supports them.
15. Store normalized structured AI results for reliable UI rendering.
16. Use database transactions when multiple writes must succeed together.
17. Prefer server-side persisted analytics over client-only progress state.

18. Make achievement processing idempotent.
19. Treat loading, empty, error, retry and permission-denied states as real product states.
20. Keep components focused and reusable.
21. Do not add a dependency unless its purpose and compatibility are clear.
22. When a dependency causes a compatibility issue, document the exact problem and
    resolution here.
    Dependency Compatibility Log

    [2026-09-19] Vitest 5 vs scaffolded @types/node
    Problem: `npm install -D vitest ...` failed with ERESOLVE.
    Root Cause: create-next-app@15 pins @types/node@^20; vitest@5 peer-requires
    @types/node ^22 || >=24.
    Fix: Bump @types/node to ^24 (runtime is Node 26). No --force / --legacy-peer-deps.
    Prevention: Keep @types/node aligned with a current LTS major.

    [2026-09-19] vite-tsconfig-paths is redundant on Vite 8
    Problem: Vitest warned the plugin is detected but unnecessary.
    Fix: Removed the package; use `resolve: { tsconfigPaths: true }` in vitest.config.mts.

    [2026-09-19] next/font/google makes builds network-dependent
    Problem: `next build` stalled 85s with "socket hang up / Retrying" fetching Geist.
    Root Cause: next/font/google downloads font files at build time; the network here is flaky.
    Fix: Use the `geist` npm package (self-hosted via next/font/local). Build went to ~6s.
    Prevention: Prefer self-hosted font packages for reproducible/offline builds.

    [2026-09-19] prettier-plugin-tailwindcss with Tailwind v4
    Problem: Semantic classes (text-muted-foreground, bg-primary) were sorted as "unknown"
    to the front of class lists.
    Root Cause: With Tailwind v4 there is no tailwind.config; the plugin needs the CSS entry.
    Fix: `"tailwindStylesheet": "./src/app/globals.css"` in .prettierrc.json.

    [2026-09-19] npm 11 install-script policy (allowScripts)
    Finding: npm 11 does not run dependency install scripts unless approved
    (`npm install-scripts approve <pkg>`). Packages relying on postinstall (e.g. Prisma
    engines, some native modules) may be silently incomplete. Prefer packages that ship
    prebuilt binaries via optionalDependencies (e.g. @node-rs/argon2) and run required
    generators explicitly (e.g. `prisma generate` in scripts).

    [2026-09-19] shadcn CLI (v4) specifics
    - `shadcn init` prompts for a preset even with -y; pass `-b radix -p nova`.
    - The `form` component no longer exists; use `field` + react-hook-form Controller.
    - `cn` is imported from the `cn` package (shadcn-ui/cn, a clsx+tailwind-merge replacement).
    - `shadcn add` prompts on overwrite; pass `--overwrite` when intended, otherwise it aborts
      silently under non-interactive stdin.

    Entry Template
    Problem:
    What failed?
    Root Cause:
    Why did it fail?
    Fix:
    What resolved it?
    Prevention:
    How do we avoid it next time?
    Project-Specific Lessons
    - Vitest defaults to the node environment. DOM/component tests must start with
      `// @vitest-environment jsdom`. (jsdom-by-default made a 2-test run take 50s.)
    - Git Bash rewrites leading-slash CLI args into Windows paths ("/" -> "C:/Program Files/Git/").
      Set MSYS_NO_PATHCONV=1 when passing URL paths to node scripts from bash.
    - PROJECT_PROGRESS.md checklist lines start with U+F0B7 (a PDF bullet), not a space.
    - Button default height was 32px in the radix-nova preset; raised to 36px (lg 40px) for
      better touch targets.
    - Prisma DateTime columns are `timestamp(3)` WITHOUT time zone holding UTC wall time.
      Raw SQL comparing them to NOW() is wrong whenever the server TimeZone isn't UTC (this
      broke rate-limit window expiry on the local server, which ran at UTC-4). In raw SQL, pass
      explicit UTC ISO strings cast with ::timestamp. Local Postgres also runs with
      timezone=UTC to match Neon.
    - Prisma Migrate blocks `migrate reset` (and other destructive commands) when invoked by
      an AI agent, and requires explicit user consent. Never bypass it; design test setup to
      be non-destructive (`migrate deploy` + unique per-run data).
    - `next build` and `next dev` both write to .next; running a build while the user's dev
      server runs corrupts both (PageNotFoundError / missing .nft.json). Verification builds
      use NEXT_DIST_DIR=.next-build.
    - Middleware that re-issues the session cookie must skip RSC/server-action requests,
      otherwise sign-out is undone by the action's internal redirect render.
    - Playwright: getByRole("alert") also matches Next's #__next-route-announcer__. Filter
      alerts by text.
    - Auth rate limits are real in E2E. Each test gets a unique x-real-ip (e2e/fixtures.ts).
    - [2026-09-19] ROOT app/loading.tsx broke client navigation. With a root loading.tsx
      above the dynamic (app) route-group layout (cookies/force-dynamic), soft navigations to
      some dynamic pages (the session report) intermittently NEVER committed: the RSC
      response arrived complete (200) and no error was thrown, but the URL and UI never
      changed. Full page loads worked, which hid it. Diagnosis took a long bisection
      (payload diffing, UTF-8 and icon hypotheses were wrong). Fix: put loading.tsx inside
      the route group (src/app/(app)/loading.tsx), below the layout. Prevention: never put
      loading.tsx at the app root above dynamic group layouts; E2E-test soft navigations
      (router.push/Link), not just page.goto.
    - lucide-react v1 marks Icon as "use client", so every icon in a Server Component is a
      client boundary (bigger RSC payloads, deduped path references). Pinned to 0.577.0,
      whose icons render as plain SVG on the server.
    - CSP nonces only work on dynamically rendered routes: Next injects the nonce at
      render time, so statically prerendered HTML (the landing page) cannot carry one.
      Providers were moved out of the root layout into per-group layouts so the dynamic
      groups can pass the nonce to next-themes' inline script while the marketing page
      stays static. Reading headers() in the root layout would make every route dynamic.
    - `npm audit`: next@15.5.25 bundles a vulnerable postcss (GHSA-6g55-p6wh-862q and
      related sourceMappingURL issues). The only fix offered is next@16 (a breaking major
      the project spec excludes). Accepted risk: postcss runs at build time over
      first-party CSS only, never on user input. Revisit when upgrading to Next 16.
    - Moving a page into a route group moves its metadata file conventions too: after
      moving page.tsx into (marketing), opengraph-image.tsx had to move with it or og:image
      was dropped (only og:image:alt survived).
    - lucide-react v1 uses .mjs icon files and 0.x uses .js: changing between them while a
      dev server is running breaks its module cache ("cannot find .../icons/check.mjs").
      Clear .next and restart the dev server after such a swap.
    - E2E flakiness on this machine came from resource contention (Postgres + Next +
      Chromium + background analysis jobs together), not product bugs: a different test
      timed out on each full run while every one passed in isolation. Fixes: assertion
      timeout raised to 10s, one local retry, and unique simulated client IPs per browser
      context so real per-IP rate limits do not leak between tests.
    - [2026-09-21] Local Postgres was WIN1252 and could not store real AI output.
      embedded-postgres runs initdb with the OS locale, so on Windows the cluster came up
      as WIN1252/English_United States.1252. The first live analysis failed with
      "character with byte sequence 0xe2 0x80 0x91 ... has no equivalent in encoding
      WIN1252": the model wrote a non-breaking hyphen (U+2011) in "three-week". The mock
      provider only ever emitted ASCII, so nothing caught it. Fixes: db-local.mjs now
      passes --encoding=UTF8 --lc-collate=C --lc-ctype=C for new clusters, creates
      databases from template0 as UTF8 even in an old cluster, and warns when an existing
      database is not UTF8; scripts/db-recreate.mjs converts existing dev databases.
      Prevention: never let initdb inherit the OS locale; verify with
      "SELECT pg_encoding_to_char(encoding) FROM pg_database".
    - [2026-09-21] Groq provider findings (verified live, not from docs):
      - Strict JSON schema works only on openai/gpt-oss-* models; elsewhere strict is
        silently ignored.
      - gpt-oss-20b cannot produce this report: it stops at its completion cap and returns
        json_validate_failed ("output was truncated"). gpt-oss-120b handles the full
        schema (~1.9k output tokens). The client now sends max_completion_tokens
        explicitly (OPENAI_MAX_OUTPUT_TOKENS, default 4096) and reports finish_reason
        "length" as a clear error instead of an unreadable-JSON error.
      - Free tier is 8K tokens/minute, so back-to-back analyses get 429s; the client now
        honours the Retry-After header (capped at 30s) instead of blind backoff.
    - Live AI checks belong in their own suite (vitest.live.config.mts / npm run verify:ai).
      When they sat in the integration config they fired paid, rate-limited calls on every
      normal test run and made the suite flaky.
    - Playwright addInitScript only affects full page loads; after client-side navigation,
      page.reload() before asserting on init-script behaviour.
    - Prisma 7 needs no engine postinstall (npm 11 skipped it) because it uses the
      TypeScript/WASM query compiler and schema engine. embedded-postgres works on Windows
      without its symlink-hydration postinstall.
    Mistake Log
    None recorded yet.
