---
sidebar_position: 2
---

# Mobile app (`@hope/mobile`)

Expo Router client for Hope. Auth uses Clerk Expo; data goes through `@hope/api-client` with Bearer JWTs (same as web).

## Setup

1. Copy env vars (or use monorepo root `.env`):

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_API_URL=http://localhost:8787
EXPO_PUBLIC_APP_URL=http://localhost:3000
```

Device tips:

| Runtime | `EXPO_PUBLIC_API_URL` |
|---|---|
| iOS Simulator | `http://localhost:8787` |
| Android Emulator | `http://10.0.2.2:8787` |
| Physical device | `http://<your-LAN-IP>:8787` |

2. Install workspace deps from the repo root:

```bash
pnpm install
```

3. Start API + mobile:

```bash
pnpm --filter @hope/api dev
pnpm mobile
```

## Clerk dashboard

Add native redirect URLs for scheme `hope` (and Expo Go / EAS URLs as needed):

- `hope://*`
- Expo auth session redirect from `@clerk/clerk-expo`

Use the **same** Clerk application / publishable key as web so tokens verify against `CLERK_SECRET_KEY` on the API.

## Monorepo / Metro

[`apps/mobile/metro.config.js`](../../../apps/mobile/metro.config.js) watches the workspace root and resolves `@hope/shared` + `@hope/api-client`. Do not import `@hope/core` or `@hope/db` from the app.

## EAS

```bash
cd apps/mobile
npx eas-cli login
npx eas init   # writes projectId into app config
pnpm eas:build:preview
pnpm eas:build:production
```

Profiles live in [`apps/mobile/eas.json`](../../../apps/mobile/eas.json): `development`, `preview`, `production`.

## Smoke checklist

1. Sign up / sign in
2. Complete onboarding (`POST /users/profile`)
3. Open Feed
4. Create a workout with a photo
5. Follow a user; accept a follow request from Notifications
6. Toggle theme / privacy in Settings
7. Upgrade opens web `/pricing` (no native Clerk Billing UI)

## Deep links

Scheme: `hope`

- `hope://users/<username>`
- `hope://workouts/<id>`

Mapped via Expo Router file paths under `app/(app)/`.
