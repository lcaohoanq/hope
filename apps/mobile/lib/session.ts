import type { PublicAppUser } from "@hope/shared";
import { getMobileApiClient } from "@/lib/api";

export type OwnerResolution =
  | { status: "signed-out" }
  | { status: "onboarding" }
  | { status: "ready"; user: PublicAppUser }
  | { status: "session_mismatch" }
  | { status: "api_unreachable" };

/**
 * Resolve the signed-in Clerk user against Hope API (`GET /users/me`),
 * mirroring web `/auth/resolve` including legacy empty profile link.
 */
export async function resolveOwner(token?: string | null): Promise<OwnerResolution> {
  if (!token) return { status: "signed-out" };

  const client = getMobileApiClient(token);

  let me: { status: string; user: PublicAppUser | null };
  try {
    const res = await client.users.me.$get();
    me = (await res.json()) as { status: string; user: PublicAppUser | null };
  } catch {
    return { status: "api_unreachable" };
  }

  if (me.status === "signed-out") {
    return { status: "session_mismatch" };
  }

  if (me.status === "ready" && me.user) {
    return { status: "ready", user: me.user };
  }

  try {
    const linkRes = await client.users.profile.$post({ json: {} });
    const linkData = (await linkRes.json()) as {
      success: boolean;
      user?: PublicAppUser;
    };
    if (linkData.success && linkData.user) {
      return { status: "ready", user: linkData.user };
    }
  } catch {
    // Legacy linking failed — continue to onboarding.
  }

  return { status: "onboarding" };
}
