import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppEnv } from "../env";

export function jsonError(
  c: Context<AppEnv>,
  error: string,
  status: ContentfulStatusCode,
  extra?: Record<string, unknown>,
) {
  return c.json({ success: false as const, error, ...(extra ?? {}) }, status);
}

export function unauthorized(c: Context<AppEnv>) {
  return jsonError(c, "Authentication is required.", 401);
}

export function onboardingRequired(c: Context<AppEnv>, message = "Complete onboarding first.") {
  return jsonError(c, message, 403);
}

export function invalidJson(c: Context<AppEnv>) {
  return jsonError(c, "Request body must be valid JSON.", 400);
}

export async function readJson<T = unknown>(
  c: Context<AppEnv>,
): Promise<{ ok: true; body: T } | { ok: false }> {
  try {
    return { ok: true, body: (await c.req.json()) as T };
  } catch {
    return { ok: false };
  }
}
