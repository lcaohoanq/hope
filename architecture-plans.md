# Architecture Plans — Fitness Tracker Web App

## 1. Product Goal

Build a simple personal fitness tracking web app that records whether the user exercised each day and visualizes consistency with a GitHub-style contribution heatmap.

The MVP must stay simple, free to operate for personal usage, easy to deploy on Vercel, and easy to maintain in one GitHub repository.

Core requirements:

- User can submit any workout type.
- User confirms workout start time and end time within the day.
- Date defaults to today in `Asia/Ho_Chi_Minh` timezone.
- Data is stored in `data/workouts.json` inside the GitHub repository.
- App renders a GitHub-style contribution history heatmap.
- Dark/black square means no workout on that day.
- Green square means at least one workout exists on that day.
- Hovering a square shows a compact detail tooltip.
- GitHub Actions sends a daily reminder email through Resend if no workout was logged.
- No paid database, no paid server, no paid scheduler.

---

## 2. Final Tech Stack

Use this stack:

- Framework: Next.js App Router
- Language: TypeScript
- Styling: Tailwind CSS
- Hosting: Vercel
- Data storage: `data/workouts.json` in GitHub repository
- Data update mechanism: Next.js API route + GitHub REST API
- Reminder scheduler: GitHub Actions scheduled workflow
- Email provider: Resend
- Database: none for MVP

Why Next.js:

- It supports frontend and backend API routes in one project.
- It deploys smoothly on Vercel.
- It keeps GitHub token and Resend API key server-side.
- It avoids exposing secrets to browser JavaScript.
- It is easier to expand later than a React-only/Vite static app.

Installed design skills to use while coding UI:

- `design-taste-frontend`
- `imagemgen-frontend-web`
- `minimalist-ui`
- `high-end-visual-design`

Design direction:

- Minimal, premium, modern personal dashboard.
- Dark-mode friendly.
- Calm spacing and typography.
- Small polished interactions.
- No noisy colors.
- Clear hover states.
- Responsive on mobile and desktop.

---

## 3. High-Level Architecture

### 3.1 Workout Submit Flow

```txt
User opens web app on Vercel
   ↓
User submits workout form
   ↓
Frontend calls POST /api/workouts
   ↓
Next.js API route validates input server-side
   ↓
API reads latest data/workouts.json from GitHub
   ↓
API appends new workout record
   ↓
API commits updated JSON back to GitHub
   ↓
Frontend updates form state and refreshes heatmap
```

### 3.2 Heatmap Display Flow

```txt
User opens home page
   ↓
Frontend calls GET /api/workouts
   ↓
API reads workout data
   ↓
Frontend groups workouts by date
   ↓
ContributionHeatmap renders last 365 days
   ↓
User hovers day square to view details
```

### 3.3 Reminder Email Flow

```txt
GitHub Actions runs daily by cron schedule
   ↓
Reminder script reads data/workouts.json from checked-out repo
   ↓
Script calculates today's date in Asia/Ho_Chi_Minh
   ↓
Script checks if any workout.date equals today
   ↓
If no workout exists, send email through Resend
   ↓
If workout exists, log and exit without sending
```

---

## 4. Project Structure

```txt
fitness-tracker/
├─ app/
│  ├─ page.tsx
│  ├─ layout.tsx
│  ├─ globals.css
│  └─ api/
│     └─ workouts/
│        └─ route.ts
├─ components/
│  ├─ WorkoutForm.tsx
│  ├─ ContributionHeatmap.tsx
│  ├─ WorkoutTooltip.tsx
│  └─ StatsCards.tsx
├─ data/
│  └─ workouts.json
├─ lib/
│  ├─ github-json.ts
│  ├─ workout-utils.ts
│  ├─ date-utils.ts
│  └─ resend.ts
├─ scripts/
│  └─ send-reminder.ts
├─ .github/
│  └─ workflows/
│     └─ reminder.yml
├─ .env.example
├─ tasks.md
├─ next.config.ts
├─ package.json
└─ README.md
```

---

## 5. Data Model

### 5.1 `data/workouts.json`

```json
{
  "workouts": [
    {
      "id": "2026-07-01-001",
      "date": "2026-07-01",
      "type": "Walking",
      "startTime": "06:30",
      "endTime": "07:10",
      "durationMinutes": 40,
      "note": "Morning walk",
      "createdAt": "2026-07-01T00:10:00.000Z"
    }
  ],
  "settings": {
    "timezone": "Asia/Ho_Chi_Minh"
  }
}
```

### 5.2 Workout Record Fields

| Field | Type | Required | Description |
|---|---:|---:|---|
| `id` | string | Yes | Unique workout ID |
| `date` | string | Yes | Workout date in `YYYY-MM-DD` format |
| `type` | string | Yes | Workout type, for example walking, gym, running, yoga |
| `startTime` | string | Yes | Start time in `HH:mm` format |
| `endTime` | string | Yes | End time in `HH:mm` format |
| `durationMinutes` | number | Yes | Auto-calculated duration |
| `note` | string | No | Optional short note |
| `createdAt` | string | Yes | ISO timestamp when record was created |

### 5.3 Validation Rules

- `type` is required.
- `startTime` is required.
- `endTime` is required.
- `startTime` must be earlier than `endTime`.
- `durationMinutes` must be greater than 0.
- `date` defaults to today in `Asia/Ho_Chi_Minh` timezone.
- `note` is optional and should be trimmed.
- Never trust client input; validate again in the API route.

---

## 6. API Design

### 6.1 `GET /api/workouts`

Purpose:

- Read workout data.
- Return all workout records to the frontend.

Response example:

```json
{
  "workouts": [
    {
      "id": "2026-07-01-001",
      "date": "2026-07-01",
      "type": "Walking",
      "startTime": "06:30",
      "endTime": "07:10",
      "durationMinutes": 40,
      "note": "Morning walk",
      "createdAt": "2026-07-01T00:10:00.000Z"
    }
  ],
  "settings": {
    "timezone": "Asia/Ho_Chi_Minh"
  }
}
```

Development fallback:

- If GitHub environment variables are missing in local development, the API may read local `data/workouts.json` to make development easier.
- Production on Vercel should read through GitHub API so the latest repo file is used.

### 6.2 `POST /api/workouts`

Purpose:

- Create a new workout record.
- Validate input.
- Update `data/workouts.json` in GitHub repo.

Request body:

```json
{
  "type": "Walking",
  "startTime": "06:30",
  "endTime": "07:10",
  "note": "Morning walk"
}
```

Response example:

```json
{
  "success": true,
  "workout": {
    "id": "2026-07-01-001",
    "date": "2026-07-01",
    "type": "Walking",
    "startTime": "06:30",
    "endTime": "07:10",
    "durationMinutes": 40,
    "note": "Morning walk",
    "createdAt": "2026-07-01T00:10:00.000Z"
  }
}
```

Error response example:

```json
{
  "success": false,
  "error": "Start time must be earlier than end time."
}
```

---

## 7. GitHub JSON Update Strategy

The browser must never write directly to the repository.

Correct flow:

```txt
Browser
   ↓
POST /api/workouts
   ↓
Next.js server-side API route
   ↓
GitHub REST API
   ↓
Commit updated data/workouts.json
```

Required environment variables on Vercel:

```env
GITHUB_TOKEN=github_pat_xxx
GITHUB_OWNER=your-github-username
GITHUB_REPO=fitness-tracker
GITHUB_BRANCH=main
WORKOUT_DATA_PATH=data/workouts.json
```

Security rules:

- Never expose `GITHUB_TOKEN` to client-side code.
- Never prefix sensitive variables with `NEXT_PUBLIC_`.
- GitHub token should only have minimum repository content permissions.
- API routes must handle errors gracefully.
- API route should not return raw token, raw GitHub error objects with sensitive data, or stack traces.

Conflict handling:

- Every update should read the latest file content and file SHA first.
- Commit update using latest SHA.
- If GitHub returns conflict, retry once:
  - read latest JSON again,
  - append the workout again if not already present,
  - commit again.

Idempotency:

- Generate stable-ish IDs that include date and timestamp/random suffix.
- Avoid duplicate append on retry by checking existing `id` before writing.

---

## 8. Contribution Heatmap Design

### 8.1 Visual Rules

- Render last 365 days.
- Each square represents one day.
- Dark/black square means no workout.
- Green square means at least one workout.
- Optional future enhancement: intensity levels based on total duration.

### 8.2 Tooltip Content

For a workout day:

```txt
2026-07-01
Walking
06:30 - 07:10
40 minutes
Morning walk
```

For multiple workouts in one day:

```txt
2026-07-01
2 workouts
Walking: 06:30 - 07:10, 40 minutes
Yoga: 20:00 - 20:20, 20 minutes
```

For a no-workout day:

```txt
2026-07-01
No workout
```

### 8.3 Grouping Logic

```ts
const workoutsByDate = new Map<string, Workout[]>();

for (const workout of workouts) {
  const existing = workoutsByDate.get(workout.date) ?? [];
  workoutsByDate.set(workout.date, [...existing, workout]);
}
```

### 8.4 Grid Logic

- Generate all dates in the last 365 days.
- Group dates into weeks.
- Each column represents one week.
- Each row represents day of week.

```txt
Column = week
Row = day of week
```

---

## 9. Reminder Email Design

Use GitHub Actions scheduled workflow and Resend.

### 9.1 Reminder Logic

```txt
Read data/workouts.json
   ↓
Get today's date in Asia/Ho_Chi_Minh
   ↓
Check if any workout.date equals today
   ↓
If no workout exists, send email
   ↓
If workout exists, do nothing
```

### 9.2 Email Content

Subject:

```txt
Nhắc tập hôm nay
```

Body:

```txt
Hôm nay bạn chưa ghi nhận buổi tập nào.

Chỉ cần vận động nhẹ 10–15 phút cũng được.
Mở app và ghi lại buổi tập hôm nay nhé.
```

### 9.3 GitHub Actions Workflow

File path:

```txt
.github/workflows/reminder.yml
```

Example:

```yaml
name: Daily workout reminder

on:
  schedule:
    - cron: "0 13 * * *"
  workflow_dispatch:

jobs:
  remind:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Send reminder if needed
        run: pnpm run reminder
        env:
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
          REMINDER_EMAIL: ${{ secrets.REMINDER_EMAIL }}
          TIMEZONE: Asia/Ho_Chi_Minh
```

`0 13 * * *` means 13:00 UTC, approximately 20:00 in Vietnam.

---

## 10. Environment Variables and Secrets

### 10.1 Vercel Environment Variables

```env
GITHUB_TOKEN=github_pat_xxx
GITHUB_OWNER=your-github-username
GITHUB_REPO=fitness-tracker
GITHUB_BRANCH=main
WORKOUT_DATA_PATH=data/workouts.json
```

### 10.2 GitHub Actions Secrets

```env
RESEND_API_KEY=re_xxx
REMINDER_EMAIL=your-email@example.com
```

### 10.3 `.env.example`

```env
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPO=
GITHUB_BRANCH=main
WORKOUT_DATA_PATH=data/workouts.json
RESEND_API_KEY=
REMINDER_EMAIL=
TIMEZONE=Asia/Ho_Chi_Minh
```

---

## 11. Implementation Phases

Use phases to keep Codex work controlled and reviewable. Do not ask Codex to implement everything in one pass.

### Phase 0 — Repository Inspection and Plan

Goal: let Codex inspect the repo and produce a plan before coding.

Tasks:

- Read `architecture-plans.md`.
- Confirm installed skills:
  - `design-taste-frontend`
  - `imagemgen-frontend-web`
  - `minimalist-ui`
  - `high-end-visual-design`
- Inspect current project structure.
- Identify missing files and dependencies.
- Propose implementation steps.
- Do not write code yet.

Suggested Codex prompt:

```txt
You are working inside this repository.

Read and strictly follow:
- architecture-plans.md
- Installed skills:
  - design-taste-frontend
  - imagemgen-frontend-web
  - minimalist-ui
  - high-end-visual-design

Goal:
Build a simple personal fitness tracking web app.

Tech stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- Deploy target: Vercel
- Data source: data/workouts.json inside this GitHub repository
- Submit flow: Next.js API route updates data/workouts.json through GitHub REST API
- Reminder flow: GitHub Actions runs daily and sends reminder email using Resend

Core product requirement:
The app tracks whether I exercised each day.
Any workout type is allowed.
A user only needs to submit:
- workout type
- start time
- end time
- optional note

The app must show a GitHub-style contribution history chart:
- dark/black square = no workout
- green square = exercised that day
- hover on a square shows a small detail tooltip:
  - date
  - workout type
  - start time
  - end time
  - duration
  - note if available

Important design direction:
Use a minimal, clean, premium, modern UI.
Avoid noisy colors.
Make it feel like a polished personal dashboard.
Prioritize spacing, typography, hover states, responsive layout, and dark-mode-friendly visuals.

Implementation rules:
- Do not expose GitHub token or Resend API key to the client.
- Keep all secret usage server-side only.
- Create .env.example.
- Validate input before saving.
- startTime must be before endTime.
- date should default to today in Asia/Ho_Chi_Minh timezone.
- Calculate durationMinutes automatically.
- Keep code simple and maintainable.
- Use small focused components.
- Do not introduce a database.
- Do not use paid services.

Now inspect the repository and create an implementation plan first.
Do not code yet.
Tell me:
1. Current repo status
2. Files you will create or modify
3. Step-by-step implementation plan
4. Any risks or assumptions
```

### Phase 1 — Project Foundation

Goal: ensure the project foundation exists.

Tasks:

- Ensure Next.js App Router, TypeScript, and Tailwind CSS are configured.
- Create base folders:
  - `app/`
  - `components/`
  - `lib/`
  - `data/`
  - `scripts/`
  - `.github/workflows/`
- Create `data/workouts.json` with empty structure.
- Create `.env.example`.
- Create or update `tasks.md`.
- Do not implement full UI yet.
- Do not implement GitHub API commit yet.
- Run available checks.

Suggested Codex prompt:

```txt
Proceed with Phase 1 only.

Create or update the Next.js App Router project foundation according to architecture-plans.md.

Tasks:
1. Ensure the project uses:
   - Next.js App Router
   - TypeScript
   - Tailwind CSS
2. Create the basic folder structure:
   - app/
   - components/
   - lib/
   - data/
   - scripts/
   - .github/workflows/
3. Create data/workouts.json with an initial empty structure:
   {
     "workouts": [],
     "settings": {
       "timezone": "Asia/Ho_Chi_Minh"
     }
   }
4. Create .env.example with all required environment variables:
   - GITHUB_TOKEN
   - GITHUB_OWNER
   - GITHUB_REPO
   - GITHUB_BRANCH
   - WORKOUT_DATA_PATH
   - RESEND_API_KEY
   - REMINDER_EMAIL
   - TIMEZONE
5. Create or update tasks.md using the tracking format from architecture-plans.md.
6. Do not implement the full UI yet.
7. Do not implement GitHub API commit yet.

After coding:
- Run typecheck/lint/build if available.
- Update tasks.md with completed items and notes.
- Report what changed.
- Report any errors.
```

### Phase 2 — Frontend UI and Heatmap

Goal: build polished frontend with mock/local data first.

Tasks:

- Build `app/page.tsx` dashboard.
- Build `components/WorkoutForm.tsx`.
- Build `components/ContributionHeatmap.tsx`.
- Build `components/WorkoutTooltip.tsx`.
- Build `components/StatsCards.tsx`.
- Render last 365 days.
- Use dark square for no workout.
- Use green square for workout.
- Show tooltip on hover.
- Show basic stats:
  - days exercised this month,
  - current streak,
  - total minutes this week.
- Use mock data or local JSON shape if API is not ready.
- Run available checks.
- Update `tasks.md`.

Suggested Codex prompt:

```txt
Proceed with Phase 2: build the frontend UI.

Use the installed design skills:
- design-taste-frontend
- imagemgen-frontend-web
- minimalist-ui
- high-end-visual-design

Build a polished personal fitness dashboard.

Required UI:
1. Home page app/page.tsx
2. Workout submission card:
   - workout type input/select
   - start time
   - end time
   - note textarea
   - submit button
3. GitHub-style contribution heatmap:
   - last 365 days
   - dark square = no workout
   - green square = workout exists
   - hover tooltip with workout details
4. Small stats section:
   - days exercised this month
   - current streak
   - total minutes this week

Component structure:
- components/WorkoutForm.tsx
- components/ContributionHeatmap.tsx
- components/WorkoutTooltip.tsx
- components/StatsCards.tsx

Design requirements:
- Minimal, modern, premium
- Dark-mode friendly
- Good spacing and typography
- Responsive on mobile and desktop
- Smooth hover states
- No clutter
- Avoid excessive colors

For now, read workout data from local mocked import or fetch /api/workouts if already available.
If API is not ready, use temporary mock data but structure it exactly like data/workouts.json.

After coding:
- Run typecheck/lint/build if available.
- Update tasks.md with completed items and notes.
- Report what changed.
- Report any errors.
```

### Phase 3 — Workout API and GitHub JSON Commit

Goal: implement read/write API.

Tasks:

- Implement `GET /api/workouts`.
- Implement `POST /api/workouts`.
- Create `lib/github-json.ts`.
- Create `lib/workout-utils.ts`.
- Create `lib/date-utils.ts` if needed.
- Validate input server-side.
- Calculate duration.
- Commit updated `data/workouts.json` through GitHub REST API.
- Add conflict retry once.
- Keep secrets server-side only.
- Run available checks.
- Update `tasks.md`.

Suggested Codex prompt:

```txt
Proceed with Phase 3: implement workout API routes.

Read architecture-plans.md carefully.

Implement:
- GET /api/workouts
- POST /api/workouts

Requirements:
1. GET /api/workouts:
   - Read data/workouts.json from the GitHub repository using GitHub REST API.
   - Return parsed workout data.
   - If GitHub env vars are missing in development, optionally fall back to local data/workouts.json.

2. POST /api/workouts:
   - Accept JSON body:
     {
       "type": string,
       "startTime": "HH:mm",
       "endTime": "HH:mm",
       "note"?: string
     }
   - Date defaults to today in Asia/Ho_Chi_Minh timezone.
   - Validate required fields.
   - Validate startTime is before endTime.
   - Calculate durationMinutes.
   - Create id.
   - Append to workouts array.
   - Commit updated data/workouts.json back to GitHub using GitHub REST API.
   - Return the created workout.

Security:
- Never expose GITHUB_TOKEN to the client.
- All GitHub token usage must stay server-side.
- Validate and sanitize input.
- Do not return raw sensitive error payloads.

Create helper files:
- lib/github-json.ts
- lib/workout-utils.ts
- lib/date-utils.ts if needed

After coding:
- Run typecheck/lint/build if available.
- Update tasks.md with completed items and notes.
- Report what changed.
- Report any errors.
```

### Phase 4 — Connect Frontend to API

Goal: make form and dashboard use real API.

Tasks:

- `WorkoutForm` submits to `POST /api/workouts`.
- Dashboard loads data from `GET /api/workouts`.
- Show loading state.
- Show success message after saving.
- Show validation errors.
- Refresh or optimistically update heatmap after submit.
- Avoid full page reload if possible.
- Run available checks.
- Update `tasks.md`.

Suggested Codex prompt:

```txt
Proceed with Phase 4: connect the frontend to the API.

Tasks:
1. WorkoutForm must submit to POST /api/workouts.
2. Show loading state while submitting.
3. Show success message after saving.
4. Show validation errors clearly.
5. Refresh or update the heatmap after successful submit.
6. GET /api/workouts should populate the dashboard.
7. Avoid full page reload if possible.

UX requirements:
- Form should feel fast and simple.
- Button should have disabled/loading state.
- Error message should be friendly.
- Success message should be subtle and clean.

After coding:
- Run typecheck/lint/build if available.
- Update tasks.md with completed items and notes.
- Report what changed.
- Report any errors.
```

### Phase 5 — GitHub Actions Reminder and Resend

Goal: daily reminder email if no workout logged.

Tasks:

- Add Resend dependency if needed.
- Create `lib/resend.ts` or direct script helper.
- Create `scripts/send-reminder.ts`.
- Create `.github/workflows/reminder.yml`.
- Workflow runs on schedule and `workflow_dispatch`.
- Script checks `data/workouts.json`.
- Script calculates today in `Asia/Ho_Chi_Minh`.
- If no workout today, send email through Resend.
- If workout exists, do nothing.
- Run available checks.
- Update `tasks.md`.

Suggested Codex prompt:

```txt
Proceed with Phase 5: implement daily reminder email using GitHub Actions and Resend.

Requirement:
GitHub Actions runs every day around 20:00 Asia/Ho_Chi_Minh time.
It checks data/workouts.json.
If today has no workout, send reminder email using Resend.

Tasks:
1. Create script:
   - scripts/send-reminder.ts
2. Script should:
   - Load data/workouts.json from repo checkout
   - Determine today's date in Asia/Ho_Chi_Minh
   - Check if any workout has date equal to today
   - If yes, log and exit without sending
   - If no, send email through Resend
3. Create workflow:
   - .github/workflows/reminder.yml
4. Workflow should:
   - run on schedule
   - also support workflow_dispatch
   - install dependencies
   - run the reminder script
5. Required GitHub repository secrets:
   - RESEND_API_KEY
   - REMINDER_EMAIL

Email content:
Subject: "Nhắc tập hôm nay"
Body:
"Hôm nay bạn chưa ghi nhận buổi tập nào. Chỉ cần vận động nhẹ 10–15 phút cũng được. Mở app và ghi lại buổi tập hôm nay nhé."

Important:
- Do not use Vercel Cron.
- Use GitHub Actions only for reminder.
- Do not expose Resend API key.

After coding:
- Run typecheck/lint/build if available.
- Update tasks.md with completed items and notes.
- Report what changed.
- Report any errors.
```

### Phase 6 — Documentation and Deployment Guide

Goal: make repo usable by future self.

Tasks:

- Create or update `README.md`.
- Explain local development.
- Explain Vercel environment variables.
- Explain GitHub Actions secrets.
- Explain GitHub token permission.
- Explain how JSON storage works.
- Explain reminder email flow.
- Add troubleshooting.
- Run checks.
- Update `tasks.md`.

Suggested Codex prompt:

```txt
Proceed with Phase 6: write setup and deployment documentation.

Create or update README.md.

README must include:
1. Project overview
2. Features
3. Tech stack
4. Local development setup
5. Required environment variables for Vercel
6. Required GitHub repository secrets for GitHub Actions
7. How data/workouts.json works
8. How submit flow works
9. How reminder email works
10. How to deploy to Vercel
11. Common troubleshooting:
   - GitHub token permission issue
   - Resend email not sending
   - GitHub Actions schedule timezone note
   - Vercel env missing
12. Future improvements:
   - edit/delete workout
   - weekly/monthly stats
   - database migration
   - authentication

Keep the documentation practical and clear.

After writing:
- Run available checks.
- Update tasks.md with completed items and notes.
- Report changed files.
```

### Phase 7 — Final Review and Hardening

Goal: check quality, security, and deploy readiness.

Tasks:

- Verify implementation matches `architecture-plans.md`.
- Verify secrets are server-side only.
- Verify heatmap logic.
- Verify validation logic.
- Verify GitHub update helper.
- Verify reminder script.
- Verify workflow file.
- Run install/typecheck/lint/build.
- Remove unnecessary dependencies.
- Update `tasks.md` with final status.

Suggested Codex prompt:

```txt
Now perform a full project review.

Check:
1. Does the implementation match architecture-plans.md?
2. Are all secrets server-side only?
3. Is data/workouts.json updated safely?
4. Does the UI meet the design direction?
5. Does the heatmap work correctly?
6. Does the reminder workflow work?
7. Are there TypeScript or lint issues?
8. Are there unnecessary dependencies?
9. Are there security risks?
10. Are there deployment risks on Vercel?

Run all available checks:
- install if needed
- typecheck
- lint
- build

Then update tasks.md and give me:
- Summary of what works
- Problems found
- Fixes applied
- Remaining manual steps
```

---

## 12. `tasks.md` Tracking Format

Create `tasks.md` at repo root and use it as the project execution log.

Rules:

- Update `tasks.md` after every phase.
- Mark completed tasks with `[x]`.
- Keep pending tasks as `[ ]`.
- Add short notes for errors, decisions, and manual steps.
- Do not delete history unless it is clearly obsolete.
- Keep it useful for continuing work in a new Codex session.

Recommended file content:

```md
# Tasks — Fitness Tracker Web App

## Current Phase

Phase 0 — Repository Inspection and Plan

## Status Legend

- [ ] Not started
- [~] In progress
- [x] Done
- [!] Blocked / needs user action

## Phase 0 — Repository Inspection and Plan

- [ ] Read architecture-plans.md
- [ ] Inspect current repo structure
- [ ] Confirm installed design skills
- [ ] Identify missing dependencies
- [ ] Produce implementation plan before coding

## Phase 1 — Project Foundation

- [ ] Confirm or create Next.js App Router setup
- [ ] Confirm or create TypeScript setup
- [ ] Confirm or create Tailwind CSS setup
- [ ] Create app/ folder structure
- [ ] Create components/ folder
- [ ] Create lib/ folder
- [ ] Create data/workouts.json
- [ ] Create scripts/ folder
- [ ] Create .github/workflows/ folder
- [ ] Create .env.example
- [ ] Run typecheck/lint/build if available

## Phase 2 — Frontend UI and Heatmap

- [ ] Build app/page.tsx dashboard
- [ ] Build WorkoutForm
- [ ] Build ContributionHeatmap
- [ ] Build WorkoutTooltip
- [ ] Build StatsCards
- [ ] Render last 365 days
- [ ] Implement dark square for no workout
- [ ] Implement green square for workout
- [ ] Implement hover tooltip
- [ ] Implement basic stats
- [ ] Make UI responsive
- [ ] Run typecheck/lint/build if available

## Phase 3 — Workout API and GitHub JSON Commit

- [ ] Implement GET /api/workouts
- [ ] Implement POST /api/workouts
- [ ] Create lib/github-json.ts
- [ ] Create lib/workout-utils.ts
- [ ] Create lib/date-utils.ts if needed
- [ ] Validate input server-side
- [ ] Calculate durationMinutes
- [ ] Commit JSON update through GitHub API
- [ ] Add conflict retry once
- [ ] Ensure secrets stay server-side only
- [ ] Run typecheck/lint/build if available

## Phase 4 — Connect Frontend to API

- [ ] Connect WorkoutForm to POST /api/workouts
- [ ] Load dashboard data from GET /api/workouts
- [ ] Add loading state
- [ ] Add success state
- [ ] Add error state
- [ ] Refresh heatmap after submit
- [ ] Avoid full page reload
- [ ] Run typecheck/lint/build if available

## Phase 5 — GitHub Actions Reminder and Resend

- [ ] Add Resend dependency if needed
- [ ] Create scripts/send-reminder.ts
- [ ] Create .github/workflows/reminder.yml
- [ ] Add schedule around 20:00 Vietnam time
- [ ] Add workflow_dispatch
- [ ] Check today in Asia/Ho_Chi_Minh
- [ ] Send email if no workout today
- [ ] Do nothing if workout exists
- [ ] Document required GitHub secrets
- [ ] Run typecheck/lint/build if available

## Phase 6 — Documentation and Deployment Guide

- [ ] Create or update README.md
- [ ] Document local development
- [ ] Document Vercel environment variables
- [ ] Document GitHub Actions secrets
- [ ] Document GitHub token permission
- [ ] Document submit flow
- [ ] Document reminder flow
- [ ] Add troubleshooting
- [ ] Add future improvements
- [ ] Run checks

## Phase 7 — Final Review and Hardening

- [ ] Verify architecture match
- [ ] Verify secrets are server-side only
- [ ] Verify heatmap logic
- [ ] Verify validation logic
- [ ] Verify GitHub update helper
- [ ] Verify reminder workflow
- [ ] Run install/typecheck/lint/build
- [ ] Remove unnecessary dependencies
- [ ] List remaining manual deployment steps

## Decisions

- Use Next.js instead of React-only/Vite because API routes are needed.
- Deploy app on Vercel.
- Store MVP data in data/workouts.json inside repo.
- Use GitHub API to update JSON from server-side API route.
- Use GitHub Actions + Resend for daily reminder.
- Do not use Vercel Cron for reminder.
- Do not use database for MVP.

## Manual Steps Needed

- [ ] Create GitHub token with minimum repository contents permission
- [ ] Add Vercel environment variables
- [ ] Add GitHub Actions secrets: RESEND_API_KEY and REMINDER_EMAIL
- [ ] Verify Resend sender/domain setup
- [ ] Deploy to Vercel
- [ ] Test submit flow in production
- [ ] Manually trigger reminder workflow once

## Change Log

### YYYY-MM-DD

- Initial architecture and task tracking created.
```

---

## 13. Suggested UI Layout

```txt
+------------------------------------------------+
| Fitness Tracker                                |
| Track daily movement and keep your streak.     |
+------------------------------------------------+

+----------------------+-------------------------+
| Submit workout       | Quick stats             |
| - Type               | - Current streak        |
| - Start time         | - This month workouts   |
| - End time           | - This week minutes     |
| - Note               |                         |
| [Submit]             |                         |
+----------------------+-------------------------+

+------------------------------------------------+
| Contribution Heatmap                           |
| [dark/green squares like GitHub]               |
+------------------------------------------------+
```

---

## 14. Future Upgrade Ideas

Not required for MVP, but useful later:

- Edit workout record.
- Delete workout record.
- Multiple intensity levels based on duration.
- Weekly and monthly charts.
- Login/authentication.
- Move storage from JSON to SQLite, Supabase, or Postgres.
- Progressive Web App support.
- Mobile-first quick submit.
- Streak badges.
- Export data to CSV.
- Import data from smartwatch apps later.

---

## 15. Final Decision

Use this architecture:

```txt
Next.js App Router
+ Vercel deployment
+ JSON file in GitHub repo
+ Next.js API route for workout submission
+ GitHub REST API for committing JSON updates
+ GitHub Actions scheduled workflow
+ Resend email reminder
+ tasks.md for phase and change tracking
```

This architecture is simple, free for MVP usage, secure enough for personal use, and easy to expand later.
