AI Impromptu Speaking Coach — Project Progress
Master checklist for the production Next.js web application.
Authentication must be implemented manually. DO NOT USE CLERK.
Strict rule: A task may only be marked [X] after implementation, testing, verification, and bug
fixing. Code existing is not proof of completion.

Status
 [X] Completed and verified
 [ ] Pending
 [~] In progress
 [!] Blocked / requires external configuration or a decision

Global Installation Rules
The coding agent must follow these rules throughout the project.
 Do not use Clerk.
 Do not install Clerk or any Clerk-related package.
 Authentication must be implemented manually.
 Before installing anything, inspect package.json, lockfile, Node version, and existing
project configuration.
 Use the existing package manager if one is already established. Otherwise use npm.
 Do not wait for permission to install normal dependencies required by the approved
tech stack.
 If a required dependency is missing, install it automatically.
 Do not mark an installation/configuration task complete until the dependency or tool is
actually installed and working.

 If a command fails because a required package is missing, install the required package
and retry.
 Do not randomly install packages to silence errors. Diagnose the actual compatibility
problem first.
 Use versions compatible with Next.js 15 and React 19.
 Prefer the smallest reasonable dependency set.
 Do not install duplicate libraries that solve the same problem.
 If a feature can be implemented using existing Next.js/browser APIs without another
dependency, prefer that approach.
 External credentials are different from local dependencies. Credentials should be
represented in .env.example; do not block implementation unnecessarily because
production credentials are unavailable.
 Never mark a task [X] because files were created alone.
 Never mark a task [X] when tests or verification failed.
 After every meaningful feature slice:

1. Implement
2. Install required dependencies
3. Run relevant tests
4. Fix failures
5. Run typecheck
6. Run lint
7. Verify the user flow
8. Update documentation
9. Mark [X] only when actually complete

Phase 0 — Project Initialization
 [X] Inspect blank repository

 [X] Verify Node/npm versions
 [X] Install/initialize Next.js 15 App Router + TypeScript
 [X] Install project dependencies required by the approved architecture
 [X] Install ESLint
 [X] Configure ESLint
 [X] Install Prettier
 [X] Configure Prettier
 [X] Install Tailwind CSS if not already included
 [X] Configure Tailwind CSS
 [X] Install/configure shadcn/ui
 [X] Install required shadcn/ui components as needed
 [X] Install unit/integration test dependencies
 [X] Configure unit/integration test runner
 [X] Install Playwright
 [X] Configure E2E testing
 [X] Install any required testing/browser dependencies
 [X] Configure package scripts
 [X] Create .env.example
 [X] Create/update SCRATCHPAD.md
 [X] Create/update LESSONS.md
 [X] Create/update ARCHITECTURE.md
 [X] Verify npm run dev
 [X] Verify npm run lint
 [X] Verify npm run typecheck
 [X] Verify npm run test
 [X] Verify npm run build

Phase 1 — Design System &amp; UI Foundation
 [X] Premium and modern responsive design system
 [X] Typography and spacing tokens
 [X] Light/dark mode
 [X] Install Framer Motion
 [X] Configure Framer Motion
 [X] Install required icon library if needed
 [X] Install/configure shadcn/ui primitives
 [X] Reusable layout/navigation
 [X] Reusable loading states
 [X] Reusable empty states
 [X] Reusable error states
 [X] Reusable success states
 [X] Accessible forms and controls
 [X] Reduced-motion support
 [X] Mobile/tablet/desktop verification
 [X] UI foundation tests

Phase 2 — Manual Authentication &amp; User Foundation
IMPORTANT: DO NOT USE CLERK. Authentication must be built manually.
Authentication Dependencies
 [X] Install password-hashing dependency
 [X] Install secure session/authentication dependency if required
 [X] Install validation dependency if not already installed
 [X] Install any required cookie/session utilities if required

Authentication System
 [X] Design manual authentication architecture
 [X] User registration
 [X] Email/password sign up
 [X] Password hashing
 [X] Password verification
 [X] Sign in
 [X] Sign out
 [X] Secure session creation
 [X] Secure session cookies
 [X] Session expiration
 [X] Session refresh/rotation where appropriate
 [X] Session invalidation on logout
 [X] Protected routes
 [X] Server-side authentication checks
 [X] Server-side authorization
 [X] Current-user helper
 [X] User ownership checks
 [X] Prevent unauthorized resource access
 [X] Application User record
 [X] Onboarding
 [X] Profile
 [X] Logout
 [X] Authentication error handling
 [X] Invalid credentials handling
 [X] Duplicate email handling

 [X] Password requirements
 [X] Authentication rate limiting
 [X] Authentication security review
 [X] Auth unit tests
 [X] Auth integration tests
 [X] Auth E2E tests
 [X] Mark complete only after all relevant tests pass

Phase 3 — Database &amp; Backend Foundation
Database Dependencies
 [X] Install Prisma
 [X] Install @prisma/client
 [X] Install Prisma development tooling
 [X] Configure PostgreSQL
 [X] Configure Prisma
 [X] Configure database environment variables
 [X] Prisma client singleton
Models
 [X] User/Profile models
 [X] Authentication/session models
 [X] Topic models
 [X] Topic history
 [X] Practice sessions
 [X] Recordings
 [X] Transcripts
 [X] Speaking analyses

 [X] Follow-up questions
 [X] Achievements
 [X] User achievements
 [X] User preferences
 [X] Notifications/preferences where required
 [X] Indexes
 [X] Foreign keys
 [X] Relationships
 [X] Cascading/deletion behavior
Database Setup
 [X] Create initial Prisma migration
 [X] Verify migrations
 [X] Seed data
 [X] Verify seed process
 [X] Database error handling
 [X] Database tests
 [X] Verify Prisma generation
 [X] Verify database connection

Phase 4 — Landing Page
 [X] Hero
 [X] Value proposition
 [X] How it works
 [X] Practice modes
 [X] AI feedback section
 [X] Progress section

 [X] CTA
 [X] Footer
 [X] SEO metadata
 [X] Open Graph metadata
 [X] Responsive review
 [X] Accessibility review
 [X] Landing-page tests
 [X] Mark complete only after verification

Phase 5 — Dashboard
 [X] Authenticated dashboard layout
 [X] Protected dashboard route
 [X] Navigation
 [X] Mobile navigation
 [X] Welcome section
 [X] Daily challenge
 [X] Session statistics
 [X] Average score
 [X] Confidence score
 [X] Speaking time
 [X] Filler-word trend
 [X] Weekly chart
 [X] Monthly chart
 [X] Install charting library if required
 [X] Configure charting library
 [X] Recent sessions

 [X] Recommendations
 [X] Streak
 [X] Achievements
 [X] Loading/empty/error states
 [X] Dashboard tests
 [X] Mark complete

Phase 6 — Random Topic Generator
 [X] Everyday Life
 [X] Business
 [X] Technology
 [X] Leadership
 [X] School
 [X] Debate
 [X] Creativity
 [X] Personal Growth
 [X] Funny Topics
 [X] Presentation Topics
 [X] Job Interview Questions
 [X] Behavioral Questions
 [X] Ice Breakers
 [X] Storytelling
 [X] Public Speaking
 [X] Easy/Medium/Hard
 [X] Category filtering
 [X] Difficulty filtering

 [X] Random topic generation
 [X] Generate Another Topic
 [X] Duplicate avoidance where appropriate
 [X] Topic history
 [X] Unit/integration tests
 [X] Edge-case tests
 [X] Mark complete

Phase 7 — Speaking Session &amp; Timer
 [X] Practice setup
 [X] Topic display
 [X] 3-2-1 countdown
 [X] 30-second timer
 [X] 1-minute timer
 [X] 2-minute timer
 [X] 3-minute timer
 [X] 5-minute timer
 [X] 10-minute timer
 [X] Elapsed time
 [X] Pause
 [X] Resume
 [X] Restart
 [X] Finish
 [X] Timer completion
 [X] Session persistence
 [X] Timer edge cases

 [X] Timer/flow tests
 [X] Mark complete

Phase 8 — Camera Recording
 [X] Camera permission
 [X] Microphone permission
 [X] Camera preview
 [X] Video recording
 [X] Audio capture
 [X] Stop recording
 [X] Preview
 [X] Retake
 [X] Delete
 [X] Save/upload
 [X] File validation
 [X] File size limits
 [X] Supported MIME types
 [X] Permission-denied handling
 [X] Unsupported-browser handling
 [X] Upload failure/retry
 [X] Recording cleanup
 [X] Desktop verification
 [!] Supported mobile-browser verification
 [X] Recording tests
 [~] Mark complete

Phase 9 — Voice-Only Mode
 [X] Camera toggle
 [X] Microphone-only recording
 [X] Audio preview
 [X] Retake
 [X] Delete
 [X] Save/upload
 [X] Permission/error handling
 [X] Unsupported-browser handling
 [X] Upload retry
 [X] Tests
 [X] Mark complete

Phase 10 — Speech Transcription
 [X] Install required transcription/AI SDK
 [X] Provider abstraction
 [X] Configure transcription provider
 [X] Secure upload
 [X] Transcription job
 [X] Full transcript
 [X] Timestamps where supported
 [X] Long-pause detection
 [X] Repeated-word detection
 [X] Filler-word detection
 [X] Processing state
 [X] Failure/retry handling

 [X] Timeout handling
 [X] Integration tests
 [X] Mark complete

Phase 11 — AI Speaking Coach
 [X] Install AI SDK/provider package
 [X] Configure OpenAI/compatible provider
 [X] Create AI service abstraction
 [X] Structured output schema
 [X] Zod validation
 [X] Clarity
 [X] Confidence
 [X] Grammar
 [X] Sentence structure
 [X] Vocabulary
 [X] Organization
 [X] Flow
 [X] Storytelling
 [X] Persuasiveness
 [X] Pace
 [X] Pauses
 [X] Filler words
 [X] Professionalism
 [X] Tone
 [X] Energy
 [X] Overall effectiveness

 [X] Overall score 0–100
 [X] Strengths
 [X] Weaknesses
 [X] Suggestions
 [X] Better wording
 [X] Grammar corrections
 [X] Confidence tips
 [X] Homework
 [X] Next practice recommendation
 [X] AI rate limiting
 [X] Retry/timeout
 [X] Malformed-output handling
 [X] AI integration tests
 [X] Mark complete

Phase 12 — Filler Word Analysis
 [X] Um
 [X] Uh
 [X] Like
 [X] You know
 [X] Basically
 [X] Actually
 [X] Literally
 [X] So
 [X] Kind of
 [X] Sort of

 [X] Occurrence count
 [X] Percentage
 [X] Occurrences/minute
 [X] Timeline where timestamps exist
 [X] Improvement suggestions
 [X] False-positive handling
 [X] False-positive tests
 [X] Mark complete

Phase 13 — Practice Modes
 [X] Interview
 [X] Presentation
 [X] Storytelling
 [X] Debate
 [X] Elevator Pitch
 [X] Sales Pitch
 [X] Networking
 [X] Meeting Simulation
 [X] Daily Speaking Challenge
 [X] Unique prompts
 [X] Mode-specific evaluation criteria
 [X] Tests
 [X] Mark complete

Phase 14 — AI Follow-Up Questions
 [X] First follow-up

 [X] Unexpected questions
 [X] Conversation context
 [X] Voice answer
 [X] Transcription
 [X] Answer evaluation
 [X] Next question
 [X] Difficulty progression
 [X] Session limits
 [X] Failure/retry
 [X] Multi-turn tests
 [X] Mark complete

Phase 15 — Toastmasters-Style Evaluation
 [X] Introduction
 [X] Body
 [X] Conclusion
 [X] Transitions
 [X] Confidence
 [X] Eye contact when actual video analysis exists
 [X] Voice variety
 [X] Grammar
 [X] Timing
 [X] Audience engagement
 [X] Persuasiveness
 [X] Overall
 [X] Summary

 [X] Actionable recommendations
 [X] Future-ready visual/body-language architecture
 [X] Tests
 [X] Mark complete

Phase 16 — Progress Tracking
 [X] Sessions completed
 [X] Average score
 [X] Confidence trend
 [X] Grammar trend
 [X] Filler-word reduction
 [X] Average pace
 [X] Total speaking time
 [X] Weekly trend
 [X] Monthly trend
 [X] Streak
 [X] Charts
 [X] Date filtering
 [X] Analytics calculations
 [X] Empty-state handling
 [X] Analytics tests
 [X] Mark complete

Phase 17 — Achievements
 [X] First Practice
 [X] 7-Day Streak

 [X] 30-Day Streak
 [X] 100 Speeches
 [X] No Filler Words
 [X] Perfect Score
 [X] Confident Speaker
 [X] Interview Master
 [X] Presentation Expert
 [X] Idempotent achievement engine
 [X] Achievement display
 [X] Achievement notification integration
 [X] Tests
 [X] Mark complete

Phase 18 — History
 [X] Past recordings
 [X] Transcripts
 [X] AI reports
 [X] Scores
 [X] Topics
 [X] Dates
 [X] Search
 [X] Mode/category/date filters
 [X] Recording playback
 [X] Delete session
 [X] Delete recording
 [X] Confirm destructive actions

 [X] Resource ownership checks
 [X] Tests
 [X] Mark complete

Phase 19 — Settings
 [X] Theme
 [X] Notifications
 [X] Preferred timer
 [X] Preferred categories
 [X] Language
 [X] Profile
 [X] Privacy
 [X] Export data
 [X] Delete account
 [X] Confirmation flows
 [X] Authentication/session settings
 [X] Tests
 [X] Mark complete

Phase 20 — Notifications &amp; Email
 [X] Install Resend if email functionality is required
 [!] Configure Resend if needed
 [X] Practice reminders
 [X] Achievement notifications
 [X] Weekly summaries
 [X] Preference controls

 [X] Email templates
 [X] Email failure handling
 [X] Tests
 [!] Mark complete

Phase 21 — Security &amp; Reliability
 [X] Route protection
 [X] Resource authorization
 [X] Zod validation
 [X] Authentication rate limiting
 [X] AI rate limiting
 [X] Upload rate limiting
 [X] Install Upstash Redis dependencies if required
 [X] Configure Upstash Redis if required
 [X] File type/size validation
 [X] Secret protection
 [X] Secure cookies
 [X] CSRF protection where applicable
 [X] Safe error messages
 [X] Structured logging
 [X] Install monitoring/error-tracking dependency if required
 [!] Configure monitoring/error tracking if required
 [X] Security audit
 [X] Dependency vulnerability review
 [!] Mark complete

Phase 22 — Testing
Unit
 [X] Topic logic
 [X] Timer logic
 [X] Filler detection
 [X] Scores
 [X] Streaks
 [X] Achievements
 [X] Schemas
 [X] Analytics
 [X] Authentication/session logic
Integration
 [X] Manual authentication
 [X] Topics
 [X] Sessions
 [X] Recording upload
 [X] Transcription
 [X] AI analysis
 [X] Follow-ups
 [X] Progress
 [X] Settings
 [X] Export/delete
 [X] Authorization/resource ownership
E2E
 [X] Sign up
 [X] Sign in

 [X] Sign out
 [X] Protected-route behavior
 [X] Start practice
 [X] Pick topic
 [X] Record
 [X] Finish
 [X] Processing
 [X] AI report
 [X] Progress
 [X] History
 [X] Settings
 [X] Delete flows
Final Checks
 [X] Lint passes
 [X] Typecheck passes
 [X] Unit tests pass
 [X] Integration tests pass
 [X] E2E tests pass
 [X] Production build passes
 [X] No critical known bugs
 [X] No accidental Clerk dependency/import/configuration exists
 [X] No secrets committed
 [X] Environment configuration reviewed

Phase 23 — Performance &amp; Accessibility
 [X] Bundle optimization

 [X] Lazy loading
 [X] Image optimization
 [X] Recording performance
 [X] AI request UX
 [X] Skeletons
 [X] Error boundaries
 [X] Keyboard navigation
 [X] Screen-reader labels
 [X] Focus management
 [X] Contrast
 [X] Reduced motion
 [X] Core Web Vitals review
 [X] Responsive review
 [X] Performance tests/review

Phase 24 — Deployment
Production Configuration
 [!] Production environment variables
 [!] production DB
 [!] Production database migration
 [!] Production authentication configuration
 [!] Production AI key
 [!] Storage production
 [!] Upstash production if used
 [!] Resend production if used
 [X] Vercel configuration

 [X] CI/CD
 [!] Preview deployment
 [!] Preview smoke test
 [!] Production deployment
 [!] Production smoke test
 [!] Monitoring
 [!] Backup strategy
 [!] Rollback procedure
 [!] Production security review
 [!] Mark complete

Dependency Installation Policy
Whenever a task requires a package, the agent must treat installation as part of
implementation.
For example:
 [ ] Install Prisma
 [ ] Install @prisma/client
 [ ] Install test runner
 [ ] Install Playwright
 [ ] Install Framer Motion
 [ ] Install AI SDK
 [ ] Install transcription provider SDK if required
 [ ] Install password hashing dependency
 [ ] Install Redis/rate-limit dependencies if required
 [ ] Install Resend if email is implemented
 [ ] Install charting library if required

Do not write:
 Verify Prisma before Prisma has been installed.
 Verify Playwright before Playwright has been installed.
 Verify test runner before the test runner exists.
 Verify authentication before authentication has been implemented.
 Verify package when the actual requirement is installation.
Verification tasks should only be used for checking something that has already been
implemented or installed.
Example:
Install Playwright
Configure Playwright
Create E2E tests
Run E2E tests
Verify E2E tests pass
Not:
Verify Playwright

Manual Authentication — Non-Negotiable Rules
The application must use its own authentication system.
DO NOT INSTALL OR USE CLERK.
The implementation should include, where appropriate:
 Users
 Password hashing
 Password verification
 Sessions
 Secure session cookies

 Session expiration
 Logout/session invalidation
 Protected routes
 Server-side authentication
 Server-side authorization
 Resource ownership checks
 Authentication validation
 Authentication rate limiting
 Secure error handling
 Password requirements
The exact authentication libraries may be selected by the agent based on compatibility with the
approved stack, but the architecture must remain fully owned by the application.
Do not expose passwords or session secrets.
Passwords must never be stored in plaintext.
Session identifiers must not be stored insecurely in client-side JavaScript-accessible storage
when secure HTTP-only cookies can be used.

Definition of Done
A feature is [X] only when:

1. It is implemented.
2. Required dependencies are installed.
3. Required configuration is complete.
4. The user flow works.
5. Backend/data behavior works where applicable.
6. Validation and error handling exist.
7. Relevant tests pass.
8. TypeScript passes.

9. Lint passes.
10. Manual verification is completed where possible.
11. No known blocking issue remains.
12. No unnecessary dependency was introduced.
13. Security implications have been reviewed.
14. This file is updated.
15. SCRATCHPAD.md is updated.
16. LESSONS.md is updated where a meaningful lesson was discovered.
17. ARCHITECTURE.md is updated when architecture changes.

Agent Execution Rule
Work sequentially through the phases.
For each task:

1. Inspect existing implementation.
2. Determine whether dependencies are required.
3. Install missing dependencies automatically.
4. Implement the feature.
5. Run relevant tests.
6. Fix failures.
7. Run typecheck.
8. Run lint.
9. Perform manual verification where applicable.
10. Update documentation.
11. Mark the task [X].
12. Move to the next task.

If a task is blocked by an external service, credential, API key, browser capability, or deployment
configuration:
[!] Blocked / external configuration required
Do not use [!] merely because a package is missing. Install the package and continue.
Do not stop the project because a normal npm dependency needs to be installed.

Final Project Rule
The objective is a working production-quality application, not a repository containing code that
merely appears complete.
Never mark [X] without evidence that the implementation works.
Never skip installation of required dependencies.
Never wait for user approval to install ordinary dependencies required by the approved
architecture.
Never use Clerk.
