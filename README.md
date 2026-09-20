# Hope

Hope is a public workout consistency tracker built with Next.js 16, Clerk, Supabase Postgres, Drizzle, Cloudinary, Sharp, Resend, and Playwright.

## Preview

**Public overview**

![Hope home page and feature overview](docs/assets/hope-demo.gif)

**Authenticated workout flow**

![Hope authenticated dashboard and workout detail flow](docs/assets/hope-workout-demo.gif)

## Architecture

- Clerk owns registration, verified email-code authentication, usernames, sessions, and email addresses.
- Supabase is Postgres only. Server code uses Drizzle with `postgres.js`; Supabase Auth and browser database clients are intentionally not used.
- Public profile and workout reads come from Postgres. Clerk sessions are resolved to a profile for every mutation.
- Appwrite converts workout images to AVIF and Sharp converts avatars to WebP. The processed buffers are uploaded to Cloudinary.
- `data/profiles.snapshot.json` and `data/workouts.json` contain sanitized demo seed data. Real migration manifests and uploaded media must stay out of git.

## Documentation site

Local:

```bash
pnpm docs:dev     # http://localhost:3001/hope/
pnpm docs:build   # static build → apps/docs/build
```

> Do not use bare `pnpm docs` — that is an npm/pnpm built-in that opens the package page in your browser, not this site.

Hosted on GitHub Pages at [https://lcaohoanq.github.io/hope/](https://lcaohoanq.github.io/hope/) (Docusaurus + TypeDoc). Deploy runs via `[.github/workflows/docs.yml](.github/workflows/docs.yml)` on pushes to `develop`.

One-time repo setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Local setup

```bash
pnpm install
cp .env.example .env
# or interactive self-host wizard:
pnpm setup
pnpm db:migrate
pnpm dev
```

Required server configuration:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=
DIRECT_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RESEND_API_KEY=
RESEND_FROM=Hope <onboarding@resend.dev>
TIMEZONE=Asia/Ho_Chi_Minh
```

Billing uses Clerk Billing (Stripe for payments). Enable user plans in the Clerk Dashboard, apply `clerk/billing.json` for the Pro plan + `past_workout_edits` feature, and point a webhook at `POST /api/webhooks/clerk`. See [Self-host](apps/docs/docs/self-host.md) for steps.

Use Supabase's transaction pooler URL for `DATABASE_URL` and a direct/session URL for `DIRECT_URL`. Do not expose either URL to the browser. Keep `CLOUDINARY_API_SECRET` server-only; authenticated workout uploads receive short-lived signed parameters from the app.

Optional GitHub-backed JSON settings are supported by `lib/github-json.ts` for legacy workflows:

```env
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPO=
GITHUB_BRANCH=main
WORKOUT_DATA_PATH=data/workouts.json
```

Keep these values server-only and grant the token the minimum repository permissions needed.

## Authentication flow

- `/login` and `/sign-up` embed Clerk's prebuilt components in the existing animated 3D shell.
- Both flows continue through `/auth/continue`.
- Migrated invitations carry trusted `appUserId` public metadata and link to the existing profile.
- New users continue to `/onboarding`, which persists display name, birth year, and DiceBear seed with `POST /api/users/profile`.
- Profiles stay public. Owner-only APIs return `401` signed out, `403` before onboarding, and `404` for a workout owned by another profile.

## Database

Generate and apply Drizzle migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

The initial migration creates `profiles`, `workouts`, and `workout_images`, their indexes and foreign keys, and enables RLS without browser-facing policies.

## Legacy migration runbook

1. Provision Supabase, Cloudinary, and the Clerk production instance.
2. Apply the Drizzle migration.
3. Copy `data/migration-manifest.example.json` to the gitignored `.migration-users.json` and fill each `appUserId`/email mapping.
4. Validate all source IDs and local assets without changing external state:

```bash
pnpm migrate:legacy -- --dry-run
```

1. Run the idempotent migration:

```bash
pnpm migrate:legacy
```

The public repository ships only sanitized demo data. If you are migrating private legacy data, keep `.migration-users.json` and any uploaded media outside git. The live run uploads deterministic legacy assets, upserts profiles/workouts/ordered images transactionally, links matching Clerk users or creates invitations, and verifies destination counts. Original passwords are never read or migrated.

## Media write guarantees

For workout and avatar writes, the server uploads processed files first, commits database changes, removes newly uploaded assets when a database commit fails, and performs replaced/removed asset deletion after commit as best effort.

## Reminders

### Private WFH tracker

Owners have a WFH tab at `/{username}/wfh`. Set employment dates there and optionally enable weekday email reminders. Each calendar year defaults to 45 days, without prorating or carryover; the annual quota is editable. Office and unrecorded days do not consume allowance. WFH rate counts only recorded workdays. All dates use Asia/Ho_Chi_Minh.

Click a past or current weekday in the calendar to open the backfill dialog, choose WFH or Office, add an optional note, and save. Existing records can be edited or cleared in the same dialog. Check-ins are limited to Monday–Friday within employment dates; weekends are disabled and excluded from stats, including any legacy weekend records.

Apply the additive database migration with `pnpm --filter @hope/db db:migrate` before deploying the updated API and web app. WFH tables have RLS enabled with no browser-facing policies; the existing server database role needs access.

The separate `wfh-reminder.yml` workflow targets 17:30 Vietnam time Monday–Friday (GitHub scheduling may run late). Set repository variable `APP_URL` to the deployed web origin and reuse the Clerk, database, and Resend secrets listed below. Reminders default off and stop after the last working day. Daily delivery records and Resend idempotency keys suppress retries; the workflow serializes runs. Manual workflow runs default to dry-run.

```bash
REMINDER_DRY_RUN=1 pnpm --filter @hope/cron reminder:wfh
```

WFH records stay private and do not contribute to workout points, feeds, or leaderboards.

WFH domain tests run with `pnpm --filter @hope/shared test`; API access tests run with `pnpm --filter @hope/api test`. The repository integration test requires a disposable local Postgres database named `hope_wfh_test`; it applies migrations and inserts/deletes test profiles:

```bash
WFH_TEST_DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/hope_wfh_test \
  pnpm --filter @hope/core exec tsx --test src/repositories/wfh.integration.test.ts
```

`pnpm reminder` queries enabled profiles and today's workouts from Postgres, then retrieves each primary email from Clerk. New profiles default to reminders disabled.

```bash
REMINDER_DRY_RUN=1 pnpm reminder
```

The workflow needs `DATABASE_URL`, `CLERK_SECRET_KEY`, `RESEND_API_KEY`, and optionally `RESEND_FROM` as GitHub Actions secrets.

## Open source hygiene

- Do not commit filled `.env` files, `.migration-users.json`, or `public/uploads`.
- Keep personal workout exports, real profile snapshots, and uploaded media private.
- Run a secret scan before publishing changes.
- See `SECURITY.md` for vulnerability reporting and secret handling notes.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm build
E2E_PORT=3100 pnpm test:e2e
pnpm migrate:legacy -- --dry-run
clerk doctor
```

Set `E2E_PUBLIC_PROFILE_USERNAME` and `E2E_CLERK_USER_EMAIL` after seeding an isolated test database to enable the owner/public profile Playwright projects.
