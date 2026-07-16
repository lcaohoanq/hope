import { auth } from "@clerk/nextjs/server";
import { type ApiClient, createApiClient } from "@hope/api-client";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export async function getServerApiClient(): Promise<ApiClient> {
  const { getToken } = await auth();
  const token = await getToken();
  return createApiClient(API_URL, token);
}
