---
sidebar_position: 3
---

# Self-host

Run the full stack locally with Docker Compose and the Hope CLI.

## Prerequisites

- Docker + Docker Compose
- Node 20+ and pnpm (for the CLI)
- Clerk keys from [dashboard.clerk.com](https://dashboard.clerk.com)
- Optional: Cloudinary keys (if not using MinIO)

## Setup wizard

From the repo root:

```bash
pnpm install
pnpm setup
```

The wizard asks for:

1. **Storage** — MinIO (self-hosted) or Cloudinary
2. **Clerk** publishable + secret keys
3. Whether to start Docker immediately

It writes `.env` and, when using MinIO, starts Compose with `--profile minio`.

## CLI commands

```bash
pnpm hope --help
pnpm setup          # reconfigure .env
pnpm up             # docker compose up (setup first if needed)
pnpm up -- --build  # rebuild images
pnpm down
pnpm status
```

## URLs

| Service | URL |
| --- | --- |
| Web | http://localhost |
| API health | http://localhost/api/health |
| Traefik dashboard | http://localhost:8080/dashboard/ |
| Postgres | `localhost:5432` (`hope` / `hope_local_pw`) |

## Environment

Minimal `.env` (also see `.env.docker` / `.env.example`):

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
STORAGE_PROVIDER=minio
```

For Cloudinary:

```env
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## Clerk dashboard

Add `http://localhost` to allowed origins and redirect URLs for the development instance.

## Notes

- MinIO is **not** exposed on the host; uploads go through the API proxy (Option B).
- Traefik uses a **file provider** (no Docker socket) for compatibility with Docker Engine 29+.
- Migrations run once via the `migrate` one-shot container before the API starts.
