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

## Auth

1. Clerk issues a session JWT.
2. Web sends `Authorization: Bearer <token>` (SSR via `auth().getToken()`, client via `useAuth().getToken()`).
3. API verifies with `@clerk/backend` and resolves the profile (`signed-out` | `onboarding` | `ready`).

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
