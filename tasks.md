# Tasks — Fitness Tracker Web App

## Current Phase

Complete — Phase 7 final review finished

## Status Legend

- [ ] Not started
- [~] In progress
- [x] Done
- [!] Blocked / needs user action

## Phase 0 — Repository Inspection and Plan

- [x] Read architecture-plans.md
- [x] Inspect current repo structure
- [x] Confirm installed design skills
- [x] Identify missing dependencies
- [x] Produce implementation plan before coding

### Phase 0 Findings — 2026-07-01

Current repo status:

- Repository is currently planning-only: `architecture-plans.md`, `tasks.md`, `skills-lock.json`, and `.agents/`.
- Codebase graph confirms there are only documentation sections and no application source modules yet.
- No Next.js, TypeScript, Tailwind, app routes, components, data file, scripts, GitHub workflow, README, or environment example exist yet.
- Git status shows all current project files are untracked in this workspace.

Confirmed design skills:

- `design-taste-frontend`
- `imagegen-frontend-web`
- `minimalist-ui`
- `high-end-visual-design`

Note: earlier planning text used `imagemgen-frontend-web`; the installed skill name is `imagegen-frontend-web`.

Missing dependencies and project files:

- Need `package.json` and a package lock after install.
- Runtime dependencies expected: `next`, `react`, `react-dom`, `resend`.
- Dev dependencies expected: `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `eslint`, `eslint-config-next`, `tailwindcss`, `postcss`, `autoprefixer`, and likely `tsx` for the reminder script.
- Need `app/`, `components/`, `lib/`, `data/`, `scripts/`, `.github/workflows/`, `.env.example`, `next.config.ts`, `tsconfig.json`, Tailwind/PostCSS config, and README.

Implementation plan:

1. Phase 1: scaffold a Next.js App Router + TypeScript + Tailwind foundation, create the planned folders, seed `data/workouts.json`, add `.env.example`, and run available checks.
2. Phase 2: build the dashboard UI with focused components for the workout form, 365-day contribution heatmap, tooltip, and stats cards using the confirmed design direction.
3. Phase 2.1: add first-run full-screen onboarding, collect name and birth year, persist profile locally, and make the heatmap profile-aware.
4. Phase 3: implement workout API routes and server-only helpers for validation, date handling, duration calculation, GitHub JSON reads/writes, and one conflict retry.
5. Phase 4: connect the frontend to API loading/submission flows with loading, success, and error states and heatmap refresh after submit.
6. Phase 5: add Resend reminder script and GitHub Actions workflow scheduled for 20:00 Vietnam time with manual dispatch.
7. Phase 6: write deployment/local development docs, required Vercel env vars, GitHub Actions secrets, token permission notes, flows, troubleshooting, and future improvements.
8. Phase 7: run final verification for architecture match, secret boundaries, validation, heatmap logic, workflow behavior, dependency cleanup, and remaining manual deployment steps.

Risks and assumptions:

- GitHub owner, repo, branch, production sender/domain, and actual secrets must be supplied manually.
- The GitHub token must have minimum contents read/write permission and must never be exposed as `NEXT_PUBLIC_*`.
- Local development should support reading `data/workouts.json` when GitHub env vars are absent.
- GitHub Actions cron uses UTC; `0 13 * * *` maps to 20:00 in `Asia/Ho_Chi_Minh`.
- The MVP stores data in a repo JSON file, so simultaneous writes need the planned SHA read/update and single retry behavior.

## Phase 1 — Project Foundation

- [x] Confirm or create Next.js App Router setup
- [x] Confirm or create TypeScript setup
- [x] Confirm or create Tailwind CSS setup
- [x] Create app/ folder structure
- [x] Create components/ folder
- [x] Create lib/ folder
- [x] Create data/workouts.json
- [x] Create scripts/ folder
- [x] Create .github/workflows/ folder
- [x] Create .env.example
- [x] Run typecheck/lint/build if available

### Phase 1 Findings — 2026-07-01

- Created Next.js App Router foundation with TypeScript, Tailwind CSS, ESLint flat config, and pnpm scripts.
- Created `app/`, `components/`, `lib/`, `data/`, `scripts/`, and `.github/workflows/`.
- Seeded `data/workouts.json` with an empty workouts array and `Asia/Ho_Chi_Minh` setting.
- Added `.env.example` for Vercel/GitHub/Resend variables.
- Added `.gitignore` for dependencies, build output, env files, and TypeScript cache.
- Verification passed: `pnpm run typecheck`, `pnpm run lint`, and `pnpm run build`.
- `pnpm audit --audit-level moderate` reports 1 moderate finding from `next`'s internal `postcss` dependency; no forced dependency downgrade was applied.

## Phase 2 — Frontend UI and Heatmap

- [x] Build app/page.tsx dashboard
- [x] Build WorkoutForm
- [x] Build ContributionHeatmap
- [x] Build WorkoutTooltip
- [x] Build StatsCards
- [x] Render last 365 days
- [x] Implement dark square for no workout
- [x] Implement green square for workout
- [x] Implement hover tooltip
- [x] Implement basic stats
- [x] Make UI responsive
- [x] Run typecheck/lint/build if available

### Phase 2 Findings — 2026-07-01

- Replaced the placeholder home page with a polished dashboard shell.
- Added local preview workout data and client-side form submission for UI validation only; API persistence remains Phase 4.
- Built `WorkoutForm`, `ContributionHeatmap`, `WorkoutTooltip`, and `StatsCards`.
- Added reusable workout/date/stat utilities in `lib/`.
- Heatmap renders the last 365 days, with dark squares for no workout and green squares for workout days.
- Tooltip appears on hover/focus and shows date, workout details, duration, and notes.
- Layout is responsive, with stats and form stacking on smaller screens and horizontal scrolling for the dense heatmap grid.
- Verification passed: `pnpm run typecheck`, `pnpm run lint`, and `pnpm run build`.

## Phase 2.1 — First-run Onboarding and Lifetime Heatmap

- [x] Create full-screen animated onboarding overlay
- [x] Show onboarding only on first page view
- [x] Step 1: ask for user's display name
- [x] Step 2: ask for user's birth year
- [x] Generate random DiceBear `notionists` avatar during onboarding
- [x] Show avatar preview in onboarding
- [x] Allow rerolling avatar before finishing onboarding
- [x] Persist avatar seed or URL with the local profile
- [x] Show saved avatar in the dashboard header
- [x] Validate display name and birth year client-side
- [x] Persist onboarding profile locally
- [x] Allow dashboard to greet user by name
- [x] Add profile reset/edit path if needed for testing
- [x] Replace fixed 365-day heatmap range with profile-aware heatmap range
- [x] Render heatmap from birth year through current year
- [x] Keep pre-2026 years empty/no-data by default
- [x] Start workout tracking/counting from 2026
- [x] Keep workout stats based on tracked workout data, not empty lifetime years
- [x] Make lifetime heatmap responsive for long date ranges
- [x] Run typecheck/lint/build if available

### Phase 2.1 Notes — 2026-07-01

- First-run onboarding should feel like a polished full-screen moment with eye-catching but performant animation.
- The onboarding sequence is two-step: name first, then birth year.
- Store profile in `localStorage` for first-run UX unless a later phase explicitly moves profile settings into repository JSON.
- Use DiceBear HTTP API with the `notionists` style for the profile avatar.
- Avatar should be random on first onboarding render, but stable after submit by persisting the random seed.
- Avatar URL format: `https://api.dicebear.com/10.x/notionists/svg?seed=<seed>`.
- Heatmap display range should use `birthYear` to current year, but actual workout tracking starts at 2026.
- Years before 2026 should render as empty/no-data cells rather than counted missed workouts.
- Because the current date is 2026-07-01, the initial tracking start year is fixed as 2026.

### Phase 2.1 Findings — 2026-07-01

- Added `OnboardingOverlay` with a full-screen two-step flow and subtle animated orbital background.
- Step 1 collects display name; step 2 collects birth year.
- Added random DiceBear `notionists` avatar generation, preview, reroll, and stable seed persistence.
- Added local profile persistence using `localStorage` and `useSyncExternalStore`.
- Added dashboard greeting, saved avatar display, birth-year summary, and reset profile button for testing.
- Reworked the heatmap into a profile-aware lifetime view grouped by year from birth year through the current year.
- Added no-data styling/tooltips for years before the 2026 tracking start.
- Kept workout stats based on tracked workout records only.
- Verification passed: `pnpm run typecheck`, `pnpm run lint`, and `pnpm run build`.

## Phase 3 — Workout API and GitHub JSON Commit

- [x] Implement GET /api/workouts
- [x] Implement POST /api/workouts
- [x] Create lib/github-json.ts
- [x] Create lib/workout-utils.ts
- [x] Create lib/date-utils.ts if needed
- [x] Validate input server-side
- [x] Calculate durationMinutes
- [x] Commit JSON update through GitHub API
- [x] Add conflict retry once
- [x] Ensure secrets stay server-side only
- [x] Run typecheck/lint/build if available

### Phase 3 Findings — 2026-07-01

- Added `GET /api/workouts` to read workout data.
- Added `POST /api/workouts` to validate input, calculate duration, create a workout record, and persist it.
- Added `lib/github-json.ts` for GitHub Contents API reads and commits.
- Added local development fallback: when GitHub env vars are absent, the API reads/writes `data/workouts.json` on the server.
- GitHub writes read latest content and SHA first, then update via Contents API.
- GitHub conflict handling retries once with a fresh read and idempotent append-by-id.
- Validation checks type, date format, tracking start date, future dates, valid `HH:mm` times, and start-before-end.
- Secrets remain server-side; API routes do not expose raw tokens, raw GitHub payloads, or stack traces.
- Verification passed: `pnpm run typecheck`, `pnpm run lint`, and `pnpm run build`.
- Route smoke checks passed: `GET /api/workouts` returns data and invalid `POST /api/workouts` returns 400 without mutating the JSON file.

## Phase 4 — Connect Frontend to API

- [x] Connect WorkoutForm to POST /api/workouts
- [x] Load dashboard data from GET /api/workouts
- [x] Add loading state
- [x] Add success state
- [x] Add error state
- [x] Refresh heatmap after submit
- [x] Avoid full page reload
- [x] Run typecheck/lint/build if available

### Phase 4 Findings — 2026-07-01

- Replaced local preview workout state with API-loaded workout data.
- Dashboard now loads workouts from `GET /api/workouts` with `cache: "no-store"`.
- Added loading skeletons for stats and heatmap while workout data loads.
- Added retryable dashboard error state for failed workout loading.
- Reworked `WorkoutForm` to submit to `POST /api/workouts` through the dashboard.
- Added submit disabled state, saving label, success message, and API error display.
- After a successful submit, the dashboard refreshes workout data without a full page reload.
- Verification passed: `pnpm run typecheck`, `pnpm run lint`, and `pnpm run build`.
- Route smoke checks passed: `GET /api/workouts` returns data and invalid `POST /api/workouts` returns 400.
- A valid POST smoke test was intentionally skipped because `.env` is present and may commit to GitHub.

## Phase 5 — GitHub Actions Reminder and Resend

- [x] Add Resend dependency if needed
- [x] Create scripts/send-reminder.ts
- [x] Create .github/workflows/reminder.yml
- [x] Add schedule around 20:00 Vietnam time
- [x] Add workflow_dispatch
- [x] Check today in Asia/Ho_Chi_Minh
- [x] Send email if no workout today
- [x] Do nothing if workout exists
- [x] Document required GitHub secrets
- [x] Run typecheck/lint/build if available

### Phase 5 Findings — 2026-07-01

- Resend dependency was already installed, so no new dependency was needed.
- Added `lib/resend.ts` for server-side Resend email sending.
- Added `scripts/send-reminder.ts` to read `data/workouts.json`, calculate today's date in `Asia/Ho_Chi_Minh`, and send only if no workout exists today.
- Added `REMINDER_DRY_RUN=1` support for safe reminder verification without sending email.
- Added `.github/workflows/reminder.yml` with cron `0 13 * * *`, which maps to 20:00 in Vietnam time.
- Added `workflow_dispatch` for manual runs.
- Workflow uses pnpm with `pnpm/action-setup@v4`, Node 20, `pnpm install --frozen-lockfile`, and `pnpm run reminder`.
- Required GitHub Actions secrets: `RESEND_API_KEY` and `REMINDER_EMAIL`.
- Optional GitHub Actions secret: `RESEND_FROM`; defaults to `Fitness Tracker <onboarding@resend.dev>` if omitted.
- Updated `.env.example` with `RESEND_FROM`.
- Verification passed: `pnpm run typecheck`, `pnpm run lint`, and `pnpm run build`.
- Reminder dry-run no-workout path passed.
- Reminder existing-workout path passed with a temporary fixture and sent no email.

## Phase 6 — Documentation and Deployment Guide

- [x] Create or update README.md
- [x] Document local development
- [x] Document Vercel environment variables
- [x] Document GitHub Actions secrets
- [x] Document GitHub token permission
- [x] Document submit flow
- [x] Document reminder flow
- [x] Add troubleshooting
- [x] Add future improvements
- [x] Run checks

### Phase 6 Findings — 2026-07-01

- Added `README.md` with feature summary, stack, local development, env vars, token permissions, submit flow, reminder flow, checks, troubleshooting, future improvements, and manual deployment steps.
- Documented pnpm commands only.
- Documented Vercel env vars for GitHub-backed workout JSON storage.
- Documented GitHub Actions secrets for Resend reminder email.
- Documented minimum GitHub token permissions: repository `Contents: Read and write` plus GitHub-provided `Metadata: Read-only`.
- Documented that secrets must not use `NEXT_PUBLIC_`.
- Verification passed: `pnpm install --frozen-lockfile`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run build`, and `REMINDER_DRY_RUN=1 pnpm run reminder`.
- `pnpm audit --audit-level moderate` still reports 1 moderate advisory from `next > postcss`; no forced downgrade or lockfile override was applied.

## Phase 7 — Final Review and Hardening

- [x] Verify architecture match
- [x] Verify secrets are server-side only
- [x] Verify heatmap logic
- [x] Verify validation logic
- [x] Verify GitHub update helper
- [x] Verify reminder workflow
- [x] Run install/typecheck/lint/build
- [x] Remove unnecessary dependencies
- [x] List remaining manual deployment steps

### Phase 7 Findings — 2026-07-01

- Architecture matches the plan: Next.js app, App Router API, repo JSON storage, GitHub Contents API production writes, GitHub Actions reminder, and Resend email.
- Secret scan confirmed `GITHUB_TOKEN`, `RESEND_API_KEY`, and `process.env` are not used in client components.
- Server-only env usage is limited to `lib/github-json.ts`, `lib/resend.ts`, `scripts/send-reminder.ts`, and the GitHub Actions workflow.
- Heatmap logic uses profile birth year through the current year, keeps pre-2026 cells as no-data, and starts workout tracking at `2026-01-01`.
- Validation logic rejects missing fields, invalid dates/times, dates before tracking start, future dates, and end times before start times.
- GitHub helper reads latest JSON/SHA, appends idempotently, commits through the Contents API, and retries once on conflict.
- Reminder workflow uses cron `0 13 * * *`, which maps to 20:00 in `Asia/Ho_Chi_Minh`, plus manual dispatch.
- Dependencies remain purposeful: `framer-motion` for onboarding animation, `resend` for email, and `tsx` for the reminder script.
- Invalid `POST /api/workouts` smoke check returned 400 without mutating data.
- Valid `POST /api/workouts` smoke check was intentionally skipped because local `.env` now contains a GitHub token and could commit to GitHub.
- Local `GET /api/workouts` smoke check returned 500 after enabling GitHub env vars, so GitHub owner/repo/branch/path/token access still needs to be verified outside the codebase.

## Decisions

- Use Next.js instead of React-only/Vite because API routes are needed.
- Deploy app on Vercel.
- Store MVP data in data/workouts.json inside repo.
- Use GitHub API to update JSON from server-side API route.
- Use GitHub Actions + Resend for daily reminder.
- Do not use Vercel Cron for reminder.
- Do not use database for MVP.
- Use installed design skills: design-taste-frontend, imagegen-frontend-web, minimalist-ui, high-end-visual-design.
- Add first-run onboarding that collects display name and birth year before showing the dashboard.
- Display the heatmap from birth year to the current year, with workout tracking starting from 2026.

## Manual Steps Needed

- [x] Create GitHub token with minimum repository contents permission
- [ ] Add Vercel environment variables
- [ ] Add GitHub Actions secrets: RESEND_API_KEY and REMINDER_EMAIL
- [ ] Add optional GitHub Actions secret: RESEND_FROM
- [ ] Verify Resend sender/domain setup
- [ ] Deploy to Vercel
- [ ] Test submit flow in production
- [ ] Manually trigger reminder workflow once

## Change Log

### 2026-07-01

- Initial architecture and task tracking created.
- Project direction fixed: Next.js + Vercel + GitHub JSON + GitHub Actions + Resend.
- Completed Phase 0 repository inspection and implementation plan.
- Completed Phase 1 project foundation and verification.
- Completed Phase 2 frontend dashboard, heatmap, form, tooltip, stats, and verification.
- Added Phase 2.1 for first-run onboarding and profile-aware lifetime heatmap.
- Completed Phase 2.1 onboarding, DiceBear avatar, lifetime heatmap, and verification.
- Completed Phase 3 workout API, GitHub JSON helper, validation, conflict retry, and verification.
- Completed Phase 4 frontend API connection, loading/success/error states, refresh after submit, and verification.
- Completed Phase 5 GitHub Actions reminder, Resend script, dry-run checks, and verification.
- Completed Phase 6 README, deployment documentation, token permission docs, troubleshooting, and verification.
- Completed Phase 7 final review, hardening checks, secret boundary scan, and remaining deployment checklist.
