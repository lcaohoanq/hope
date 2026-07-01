# Fitness Tracker

A personal workout consistency tracker built with Next.js App Router, TypeScript, Tailwind CSS, GitHub JSON storage, GitHub Actions, and Resend.

The app records daily workouts, shows a GitHub-style lifetime heatmap, and can send a daily reminder email if no workout has been logged.

## Features

- First-run onboarding with display name, birth year, and DiceBear `notionists` avatar.
- Lifetime heatmap from birth year to the current year.
- Workout tracking starts at `2026-01-01`; earlier years render as no-data cells.
- Workout form with server-side validation.
- `GET /api/workouts` and `POST /api/workouts`.
- MVP storage in `data/workouts.json`.
- Server-side GitHub Contents API commits for production writes.
- Local development fallback to server-side local JSON reads/writes when GitHub env vars are absent.
- GitHub Actions daily reminder through Resend.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- pnpm
- Vercel
- GitHub Contents API
- GitHub Actions
- Resend

## Local Development

Install dependencies:

```bash
pnpm install
```

Create a local env file:

```bash
cp .env.example .env
```

Run the app:

```bash
pnpm run dev
```

Open `http://localhost:3000`.

If GitHub env vars are not configured locally, API routes read and write `data/workouts.json` directly on the server. If GitHub env vars are configured, `POST /api/workouts` may commit to GitHub.

## Environment Variables

### Vercel

Set these in Vercel for the web app:

```env
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPO=
GITHUB_BRANCH=main
WORKOUT_DATA_PATH=data/workouts.json
```

Use a fine-grained GitHub token with access only to this repository.

Required token permissions:

- `Contents`: Read and write
- `Metadata`: Read-only, included by GitHub

Do not use `NEXT_PUBLIC_` for secrets.

### GitHub Actions

Set these repository secrets for the reminder workflow:

```env
RESEND_API_KEY=
REMINDER_EMAIL=
```

Optional:

```env
RESEND_FROM=Fitness Tracker <onboarding@resend.dev>
```

`RESEND_FROM` should be changed to a verified Resend sender or domain for production.

## Submit Flow

1. User submits workout type, date, start time, end time, and optional note.
2. Frontend calls `POST /api/workouts`.
3. The API validates input server-side.
4. The API calculates `durationMinutes`.
5. In production, the API reads latest `data/workouts.json` through GitHub Contents API.
6. The API appends the new workout and commits the updated JSON.
7. If GitHub returns a conflict, the API reads again and retries once.
8. The frontend refreshes workout data without a full page reload.

## Reminder Flow

The workflow lives at `.github/workflows/reminder.yml`.

- Runs daily at `0 13 * * *` UTC, which is 20:00 in Vietnam time.
- Supports manual `workflow_dispatch`.
- Checks today's date in `Asia/Ho_Chi_Minh`.
- Reads `data/workouts.json` from the checked-out repository.
- Sends a Resend email if no workout exists for today.
- Does nothing if a workout already exists today.

Safe dry run:

```bash
REMINDER_DRY_RUN=1 pnpm run reminder
```

## Data Shape

`data/workouts.json`:

```json
{
  "workouts": [],
  "settings": {
    "timezone": "Asia/Ho_Chi_Minh"
  }
}
```

Workout record:

```json
{
  "id": "2026-07-01-1234567890-abcd1234",
  "date": "2026-07-01",
  "type": "Walking",
  "startTime": "06:30",
  "endTime": "07:10",
  "durationMinutes": 40,
  "note": "Morning walk",
  "createdAt": "2026-07-01T00:10:00.000Z"
}
```

## Checks

```bash
pnpm run typecheck
pnpm run lint
pnpm run build
REMINDER_DRY_RUN=1 pnpm run reminder
```

## Troubleshooting

- `POST /api/workouts` returns `Unable to save workout.`: check GitHub env vars, token permission, repo owner/name, branch, and `WORKOUT_DATA_PATH`.
- Data saves locally but not in production: verify `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, and `GITHUB_BRANCH` in Vercel.
- Reminder workflow does not send: verify `RESEND_API_KEY`, `REMINDER_EMAIL`, and Resend sender/domain setup.
- Reminder sends from `onboarding@resend.dev`: set `RESEND_FROM` to a verified sender for production.
- Heatmap does not show onboarding again: click `Reset profile` in the dashboard to clear the local browser profile.

## Future Improvements

- Move onboarding profile into repository JSON or a real account model.
- Add intensity levels based on total workout duration.
- Add edit/delete workout support.
- Add yearly heatmap filters.
- Add authenticated access before sharing the app publicly.

## Manual Deployment Steps

- Create a fine-grained GitHub token with repository `Contents: Read and write`.
- Add Vercel environment variables.
- Add GitHub Actions secrets: `RESEND_API_KEY`, `REMINDER_EMAIL`, and optionally `RESEND_FROM`.
- Verify Resend sender/domain setup.
- Deploy to Vercel.
- Test submit flow in production.
- Manually trigger the reminder workflow once.
