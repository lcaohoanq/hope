import type { PublicAppUser } from "@/lib/users";
import { getServerApiClient } from "./api";

export type OwnerResolution =
  | { status: "signed-out" }
  | { status: "onboarding" }
  | { status: "ready"; user: PublicAppUser };

export async function resolveOwner(): Promise<OwnerResolution> {
  const client = await getServerApiClient();
  const res = await client.users.me.$get();
  const data = (await res.json()) as { status: string; user: PublicAppUser | null };
  if (data.status === "ready" && data.user) {
    return { status: "ready", user: data.user };
  }
  if (data.status === "onboarding") return { status: "onboarding" };
  return { status: "signed-out" };
}

export function sanitizeNextPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  if (value.startsWith("//") || value.includes("://")) return null;
  return value;
}
