import type { AppType } from "@hope/api";
import { hc } from "hono/client";

export type { AppType };
export type ApiClient = ReturnType<typeof hc<AppType>>;

export function createApiClient(baseUrl: string, token?: string | null) {
  return hc<AppType>(baseUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

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

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}
