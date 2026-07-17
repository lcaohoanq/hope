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

Keep Clerk/API keys in the **repo-root** `.env` / `.env.local`. `apps/web/next.config.ts` loads those files; also keep a copy of `NEXT_PUBLIC_*` / `CLERK_*` in `apps/web/.env.local` for Next’s client bundle (or re-sync after editing root env).

Minimal `.env` (also see `.env.docker` / `.env.example`):

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_KEYLESS_DISABLED=1
NEXT_PUBLIC_API_URL=http://localhost:8787
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

### Billing (Clerk Billing + Stripe)

1. Enable Billing for **user** plans: [Dashboard → Billing → Settings](https://dashboard.clerk.com/last-active?path=billing/settings), or after `clerk auth login`:

   ```bash
   clerk enable billing --for user
   clerk config patch --file clerk/billing.json --dry-run
   clerk config patch --file clerk/billing.json --yes
   ```

   `clerk/billing.json` must match the Platform config schema (`user_enabled`, `plans`/`features` as objects keyed by slug, plan `features` as slug string arrays). Validate with `clerk config schema --keys billing`.

2. Confirm a **Pro** plan with slug `pro` and feature `past_workout_edits` exists under User Plans.
3. Add a Clerk webhook endpoint. Prefer the API (Traefik strips `/api`):

   | Environment | Endpoint URL |
   | --- | --- |
   | Docker / Traefik | `http://localhost/api/webhooks/clerk` |
   | API only | `http://localhost:8787/webhooks/clerk` |
   | Next only (`next dev`) | `http://localhost:3000/api/webhooks/clerk` (+ `DATABASE_URL` on web) |

   Subscribe to billing events (`subscription.*`, `subscriptionItem.*`, optionally `paymentAttempt.*`).

   Local relay without a public URL:

   ```bash
   clerk webhooks listen --token "$(clerk webhooks token)" --forward-to http://localhost:8787/webhooks/clerk
   ```

4. Copy the endpoint signing secret into `.env` as `CLERK_WEBHOOK_SIGNING_SECRET` (API and/or web).
5. Dev instances can use Clerk’s shared payment gateway; production requires linking your Stripe account in Clerk Billing.
6. After checkout, UI uses session `has({ feature })` immediately; DB `profiles.plan` updates when the webhook runs.

## Notes

- MinIO is **not** exposed on the host; uploads go through the API proxy (Option B).
- Traefik uses a **file provider** (no Docker socket) for compatibility with Docker Engine 29+.
- Migrations run once via the `migrate` one-shot container before the API starts.
