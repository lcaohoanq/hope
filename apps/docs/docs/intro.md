---
sidebar_position: 1
slug: /intro
---

# Introduction

Hope is a workout consistency tracker split into a pnpm + Turborepo monorepo:

| Package / app | Role |
| --- | --- |
| `apps/web` | Next.js UI (pure-API client) |
| `apps/api` | Hono API (Cloudflare Workers or Node for Docker) |
| `apps/cron` | Reminder emails via GitHub Actions |
| `apps/docs` | This documentation site |
| `packages/shared` | Shared types, validation, i18n helpers |
| `packages/api-client` | Typed Hono RPC client |
| `packages/db` | Drizzle schema + Postgres client |
| `packages/core` | Repositories, storage adapters (API/cron only) |

## Public API surface

TypeDoc on this site documents the packages intended for app and client authors:

- **`@hope/shared`** — domain types, Zod validation, date/workout helpers
- **`@hope/api-client`** — `createApiClient`, `ApiError`, and the Hono `AppType`

Internal packages (`@hope/db`, `@hope/core`) are not generated here.

## Quick links

- [Architecture](./architecture.md)
- [Self-host with Docker](./self-host.md)
- [Using the API client](./guides/api-client.md)
- [API Reference](./api/README.md) (generated)
