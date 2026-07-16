import { verifyToken } from "@clerk/backend";
import { getProfileByClerkId } from "@hope/core";
import type { Context } from "hono";
import type { AppEnv } from "../env";

type Profile = NonNullable<Awaited<ReturnType<typeof getProfileByClerkId>>>;

export type OwnerResolution =
  | { status: "signed-out" }
  | { status: "onboarding"; clerkUserId: string }
  | { status: "ready"; clerkUserId: string; profile: Profile };

async function getClerkUserId(c: Context<AppEnv>): Promise<string | null> {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
  if (!token) return null;

  try {
    const payload = await verifyToken(token, { secretKey: c.env.CLERK_SECRET_KEY });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function resolveOwner(c: Context<AppEnv>): Promise<OwnerResolution> {
  const clerkUserId = await getClerkUserId(c);
  if (!clerkUserId) return { status: "signed-out" };

  const profile = await getProfileByClerkId(clerkUserId);
  if (!profile) return { status: "onboarding", clerkUserId };

  return { status: "ready", clerkUserId, profile };
}
