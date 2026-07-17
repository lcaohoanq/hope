import type { AppType } from "@hope/api";
import { hc } from "hono/client";

/**
 * Hono app type used for RPC typing.
 *
 * This mirrors the server route tree (`typeof routes`) for `hc<AppType>`,
 * not an OpenAPI document. HTTP OpenAPI docs are generated separately.
 */
export type { AppType };

/**
 * Typed Hono RPC client bound to {@link AppType}.
 */
export type ApiClient = ReturnType<typeof hc<AppType>>;

/**
 * Create a typed Hono RPC client for the Hope API.
 *
 * @param baseUrl - API origin with no trailing path (e.g. `http://localhost:8787` or `http://localhost/api`).
 * @param token - Optional Clerk session JWT sent as `Authorization: Bearer …`.
 * @returns A typed {@link ApiClient} for calling Hono routes via RPC.
 *
 * @example
 * ```ts
 * const client = createApiClient("http://localhost:8787", token);
 * const res = await client.feed.$get({ query: { cursor: undefined } });
 * const data = await unwrapResponse(res);
 * ```
 */
export function createApiClient(baseUrl: string, token?: string | null) {
  return hc<AppType>(baseUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

/**
 * Parse a `fetch` {@link Response} as JSON and throw {@link ApiError} on non-OK status.
 *
 * @param response - Raw fetch response from a Hono RPC call.
 * @returns Parsed JSON body typed as `T` when `response.ok` is true.
 * @throws {@link ApiError} when the response status is not OK.
 */
export async function unwrapResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : `API request failed (${response.status})`;
    throw new ApiError(message, response.status, data);
  }
  return data as T;
}

/**
 * Error thrown by {@link unwrapResponse} for non-OK API responses.
 */
export class ApiError extends Error {
  /** HTTP status code from the failed response. */
  status: number;
  /** Parsed response body (often `{ success: false, error: string }`). */
  data: unknown;

  /**
   * @param message - Human-readable error message.
   * @param status - HTTP status code.
   * @param data - Optional parsed response body.
   */
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Extract a user-facing message from an unknown thrown value.
 *
 * @param error - Caught value (often {@link ApiError} or `Error`).
 * @param fallback - Message used when `error` has no usable `message`.
 * @returns A string suitable for UI or logs.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}
