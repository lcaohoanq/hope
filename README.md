# Fitness Tracker

A personal workout consistency tracker built with Next.js App Router, TypeScript, Tailwind CSS, GitHub JSON storage, GitHub Actions, and Resend.

The app records daily workouts, shows a GitHub-style lifetime heatmap, and can send a daily reminder email if no workout has been logged.

## Features

- First-run onboarding with display name, birth year, and DiceBear `notionists` avatar.
- Static multi-user routes for `@hoang` and `@linh`.
- Lifetime heatmap from birth year to the current year.
- Workout tracking starts at `2026-01-01`; earlier years render as no-data cells.
- Workout form with server-side validation.
- Workout detail view with inline editing.
- Workout image uploads optimized to AVIF through the Appwrite `processImageHope` function.
- `GET /api/workouts`, `POST /api/workouts`, and `PATCH /api/workouts`.
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
- Appwrite Functions
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

Open `http://localhost:3000/@hoang` or `http://localhost:3000/@linh`.
The root URL redirects to `@hoang`.

If GitHub env vars are not configured locally, API routes read and write `data/workouts.json` directly on the server and write optimized images to `public/uploads`. If GitHub env vars are configured, `POST /api/workouts` may commit to GitHub. Image processing still requires the Appwrite image processor env vars.

## Environment Variables

### Vercel

Set these in Vercel for the web app:

```env
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPO=
GITHUB_BRANCH=main
WORKOUT_DATA_PATH=data/workouts.json
APPWRITE_IMAGE_PROCESSOR_URL=
APPWRITE_IMAGE_PROCESSOR_KEY=
```

Use a fine-grained GitHub token with access only to this repository.

Required token permissions:

- `Contents`: Read and write
- `Metadata`: Read-only, included by GitHub

Do not use `NEXT_PUBLIC_` for secrets.

`APPWRITE_IMAGE_PROCESSOR_URL` should point to the deployed Appwrite function URL for `processImageHope`.
Set `APPWRITE_IMAGE_PROCESSOR_KEY` only if the function checks the `X-Appwrite-Key` header.

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

1. User submits workout type, date, start time, end time, optional note, and up to 3 optional images.
2. Frontend calls `POST /api/workouts` as JSON for no-image submits or `multipart/form-data` when images are selected.
3. The API validates input server-side.
4. The API validates image MIME type, then calls the Appwrite `processImageHope` function to decode and optimize each image to AVIF.
5. The API calculates `durationMinutes`.
6. In production, the API reads latest `data/workouts.json` through GitHub Contents API.
7. The API appends the new workout and commits the updated JSON with optimized AVIF files.
8. If GitHub returns a conflict, the API reads again and retries once.
9. The frontend refreshes workout data without a full page reload.

## Multi-user Routes

- Declared users live in `lib/users.ts`.
- Hoang is available at `/@hoang`.
- Linh is available at `/@linh`.
- Workouts are stored in the same JSON file with `userId`.
- Legacy workouts without `userId` are shown under Hoang.
- API reads use `GET /api/workouts?userId=hoang` or `userId=linh`.

## Edit Flow

1. User clicks a heatmap day and opens the workout detail modal.
2. User clicks `Edit` on a workout record.
3. Frontend calls `PATCH /api/workouts` as JSON for text-only edits or `multipart/form-data` when adding images.
4. The API validates the workout id and edited fields server-side.
5. Existing images are preserved; new images can be appended up to 3 total images per workout.
6. In production, the API commits the updated JSON and any new optimized AVIF files together where possible.

## Image Uploads

- Images are processed by the Appwrite `processImageHope` function; the Vercel web app does not import `sharp`.
- Original uploads are never stored, committed, or written as base64 in JSON.
- Optimized images are saved as AVIF under `public/uploads/YYYY/MM/`.
- JSON stores public paths like `/uploads/2026/07/2026-07-07-workout-abcd1234.avif`.
- HEIC/HEIF uploads are best-effort. If the Appwrite function's `sharp`/libvips build cannot decode them, upload JPG, PNG, or WebP instead.
- In local mode, optimized images are written to the working tree under `public/uploads`.
- In GitHub-backed mode, optimized images and `data/workouts.json` are committed together where possible.
- On Vercel, runtime writes to `public` are not persistent. Files committed to `public/uploads` through GitHub are not guaranteed to be available from `/uploads/...` until the app redeploys.
- The UI tries `/uploads/...` first, then falls back to `/api/uploads/...` so newly committed GitHub-backed images can still render before a redeploy when the API can read the repository file.
- `public/uploads` is intentionally trackable, so repo size will grow over time. Keep only optimized AVIF files there and never store originals.

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
  "images": [
    {
      "src": "/uploads/2026/07/2026-07-01-workout-abcd1234.avif",
      "format": "avif",
      "width": 1200,
      "height": 900,
      "sizeBytes": 84321
    }
  ],
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
- Uploaded image path returns 404 in production: redeploy the app so newly committed `public/uploads` assets are included in the deployed build.
- Image upload returns `Image processing service is not configured.`: set `APPWRITE_IMAGE_PROCESSOR_URL` in Vercel.
- Image upload returns `Unable to reach the image processing service.`: verify the Appwrite function URL and execution permissions.
- HEIC/HEIF upload fails: the deployed Appwrite `sharp`/libvips build may not support that format; upload JPG, PNG, or WebP.
- Reminder workflow does not send: verify `RESEND_API_KEY`, `REMINDER_EMAIL`, and Resend sender/domain setup.
- Reminder sends from `onboarding@resend.dev`: set `RESEND_FROM` to a verified sender for production.
- Heatmap does not show onboarding again: click `Reset profile` in the dashboard to clear the local browser profile.

## Future Improvements

- Move onboarding profile into repository JSON or a real account model.
- Add intensity levels based on total workout duration.
- Add delete workout support.
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
