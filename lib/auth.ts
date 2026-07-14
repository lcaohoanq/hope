import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/repositories/profiles";

export type OwnerResolution =
  | { status: "signed-out" }
  | { status: "onboarding"; clerkUserId: string }
  | {
      status: "ready";
      clerkUserId: string;
      profile: NonNullable<Awaited<ReturnType<typeof getProfileByClerkId>>>;
    };

export async function resolveOwner(): Promise<OwnerResolution> {
  const { userId } = await auth();
  if (!userId) return { status: "signed-out" };

  const profile = await getProfileByClerkId(userId);
  if (!profile) return { status: "onboarding", clerkUserId: userId };
  return { status: "ready", clerkUserId: userId, profile };
}

export function sanitizeNextPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  if (value.startsWith("//") || value.includes("://")) return null;
  return value;
}
