---
sidebar_position: 2
---

# Architecture

Hope follows a **pure-API** frontend: `apps/web` never talks to Postgres or Cloudinary/MinIO directly. All data access goes through `apps/api`.

```text
Browser / Next.js SSR
        |  Bearer token (Clerk)
        v
   apps/api (Hono)
        |
   +----+----+
   v         v
packages/  packages/
  core       db --> Postgres
   |
   +-- storage adapter --> MinIO or Cloudinary
```

## Dependency DAG

```text
@hope/shared
    ^
@hope/db <-- @hope/core <-- apps/api
                               ^
                 @hope/api-client (types via AppType)
                               ^
                            apps/web
```

- **`@hope/shared`** — isomorphic; safe in browser and Workers.
- **`@hope/api-client`** — wraps `hono/client` with `hc<AppType>`.
- **`@hope/core` / `@hope/db`** — server-only (API, cron, migrations).

Docs on this site split three ways: hand-written **Guides**, TypeDoc **Library Reference** (`@hope/shared` / `@hope/api-client`), and **HTTP API** OpenAPI (from Hono `describeRoute`, rendered with Scalar).

## Auth

1. Clerk issues a session JWT.
2. Web sends `Authorization: Bearer <token>` (SSR via `auth().getToken()`, client via `useAuth().getToken()`).
3. API verifies with `@clerk/backend` and resolves the profile (`signed-out` | `onboarding` | `ready`).

## Billing

Hope uses **Clerk Billing** (Stripe for payment processing) for B2C subscriptions:

1. Users subscribe on `/pricing` via Clerk `<PricingTable for="user" />`.
2. UI entitlements use Clerk `has({ feature })` / `has({ plan })` (session updates right after checkout).
3. Webhooks mirror the paid plan into `profiles.plan` for API enforcement:
   - Self-host / Traefik: `POST /api/webhooks/clerk` → Hono API (`apps/api`)
   - Direct Next (`next dev` / Vercel with `DATABASE_URL`): `apps/web/app/api/webhooks/clerk`
   - Shared sync: `syncHopePlanFromClerkBillingEvent` in `@hope/core`
4. Capabilities are gated by **features**, not scattered `plan === "pro"` checks:
   - App catalog: `PLAN_FEATURES` / `hasFeature()` in `@hope/shared`
   - Clerk session: `auth().has({ feature: 'past_workout_edits' })` / `useAuth().has(...)`
   - Clerk Feature slugs stay in sync via [`clerk/billing.json`](../../../clerk/billing.json)
   - Use `isProPlan()` / `has({ plan: 'pro' })` for badge / pricing CTA copy

When adding a Pro capability: add the slug to `FEATURE_SLUGS` + `PLAN_FEATURES.pro`, mirror it in `clerk/billing.json`, gate API with `hasFeature`, and gate web UX with Clerk `has({ feature })`.

Configure plans with `clerk config patch --file clerk/billing.json --yes`. Production instances must link a Stripe account in Clerk Billing settings.

## Storage

`STORAGE_PROVIDER` selects the adapter:

| Provider | Upload path | Public URLs |
| --- | --- | --- |
| `minio` | Client → `POST /workout-images/upload` → API → MinIO | `GET /api/storage/*` proxy |
| `cloudinary` | Signed tickets or adapter upload | Cloudinary CDN |

## Self-host edge

Docker Compose runs Traefik on `:80`:

- `/` → `web:3000`
- `/api/*` → `api:8787` (prefix stripped)

See [Self-host](./self-host.md).
