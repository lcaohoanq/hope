import { type ApiClient, ApiError, createApiClient } from "@hope/api-client";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export function getClientApiClient(token?: string | null): ApiClient {
  return createApiClient(API_URL, token);
}

type ApiResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

export async function parseApiJson<T>(response: ApiResponse): Promise<T> {
  const body = await response.text();

  if (!body) {
    if (response.ok) return {} as T;
    throw new Error(`API request failed (${response.status}).`);
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    const message = response.ok
      ? "The API returned an invalid response."
      : `API request failed (${response.status}): ${body}`;
    throw new Error(message);
  }
}

export const externalHttpClient = axios.create({
  validateStatus: () => true,
});

export function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallbackMessage;
}
