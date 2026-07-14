# Hope

Hope is a public workout consistency tracker built with Next.js 16, Clerk, Supabase Postgres, Drizzle, Cloudinary, Appwrite image processing, Sharp, Resend, and Playwright.

## Architecture

- Clerk owns registration, verified email-code authentication, usernames, sessions, and email addresses.
- Supabase is Postgres only. Server code uses Drizzle with `postgres.js`; Supabase Auth and browser database clients are intentionally not used.
- Public profile and workout reads come from Postgres. Clerk sessions are resolved to a profile for every mutation.
- Appwrite converts workout images to AVIF and Sharp converts avatars to WebP. The processed buffers are uploaded to Cloudinary.
- `data/workouts.json` and `public/uploads` are a read-only rollback archive for the migration release.

## Local setup

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm dev
```

Required server configuration:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
DATABASE_URL=
DIRECT_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Use Supabase's transaction pooler URL for `DATABASE_URL` and a direct/session URL for `DIRECT_URL`. Do not expose either URL to the browser. Keep `CLOUDINARY_API_SECRET` server-only; authenticated workout uploads receive short-lived signed parameters from the app.

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

5. Run the idempotent migration:

```bash
pnpm migrate:legacy
```

The live run uploads deterministic legacy assets, upserts profiles/workouts/ordered images transactionally, links matching Clerk users or creates invitations, and verifies destination counts. Original passwords are never read or migrated.

## Media write guarantees

For workout and avatar writes, the server uploads processed files first, commits database changes, removes newly uploaded assets when a database commit fails, and performs replaced/removed asset deletion after commit as best effort.

## Reminders

`pnpm reminder` queries enabled profiles and today's workouts from Postgres, then retrieves each primary email from Clerk. New profiles default to reminders disabled.

```bash
REMINDER_DRY_RUN=1 pnpm reminder
```

The workflow needs `DATABASE_URL`, `CLERK_SECRET_KEY`, `RESEND_API_KEY`, and optionally `RESEND_FROM` as GitHub Actions secrets.

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
