---
sidebar_position: 1
---

# Using `@hope/api-client`

Typed Hono RPC client shared by the web app (and future mobile clients).

## Install

In the monorepo, depend on the workspace package:

```json
{
  "dependencies": {
    "@hope/api-client": "workspace:*"
  }
}
```

## Create a client

```ts
import { createApiClient, unwrapResponse, ApiError } from "@hope/api-client";

const client = createApiClient("http://localhost:8787", token);
```

- `baseUrl` — API origin (no trailing path). Behind Traefik use `http://localhost/api`.
- `token` — optional Clerk JWT; sent as `Authorization: Bearer …`.

## SSR (Next.js)

```ts
import { auth } from "@clerk/nextjs/server";
import { createApiClient } from "@hope/api-client";

export async function getServerApiClient() {
  const { getToken } = await auth();
  const token = await getToken();
  const baseUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL!;
  return createApiClient(baseUrl, token);
}
```

In Docker, browser calls use `NEXT_PUBLIC_API_URL=http://localhost/api` while SSR uses `API_URL=http://api:8787`.

## Client components

```ts
"use client";
import { useAuth } from "@clerk/nextjs";
import { createApiClient } from "@hope/api-client";

const { getToken } = useAuth();
const token = await getToken();
const client = createApiClient(process.env.NEXT_PUBLIC_API_URL!, token);

const res = await client.feed.$get({ query: { cursor: undefined } });
const data = await res.json();
if (!res.ok) throw new Error("error" in data ? data.error : "Request failed");
```

Always call `getToken()` before each request (short-lived session JWTs).

## Errors

```ts
import { ApiError, getErrorMessage, unwrapResponse } from "@hope/api-client";

try {
  const data = await unwrapResponse<MyType>(response);
} catch (error) {
  console.error(getErrorMessage(error, "Something went wrong"));
  if (error instanceof ApiError) {
    console.error(error.status, error.data);
  }
}
```

## Types

`AppType` is re-exported from `@hope/api` so the client stays in sync with Hono routes:

```ts
import type { AppType, ApiClient } from "@hope/api-client";
```

See the generated [API Reference](../api/README.md) for exported symbols from `@hope/shared` and `@hope/api-client`.
