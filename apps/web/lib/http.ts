import { type ApiClient, ApiError, createApiClient } from "@hope/api-client";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export function getClientApiClient(token?: string | null): ApiClient {
  return createApiClient(API_URL, token);
}

export const externalHttpClient = axios.create({
  validateStatus: () => true,
});

export function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallbackMessage;
}
