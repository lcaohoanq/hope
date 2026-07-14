import { auth, currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { getProfileByClerkId, linkClerkUserToProfile } from "@/lib/repositories/profiles";
import { getCanonicalUserPath } from "@/lib/users";

function getConfiguredAppOrigin() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) return undefined;

  try {
    return new URL(appUrl).origin;
  } catch {
    return undefined;
  }
}

function getRequestOrigin(request: NextRequest) {
  const url = new URL(request.url);
  if (url.hostname === "0.0.0.0" || url.hostname === "::") {
    url.hostname = "localhost";
  }
  return url.origin;
}

function redirectTo(request: NextRequest, pathname: string) {
  return NextResponse.redirect(
    new URL(pathname, getConfiguredAppOrigin() ?? getRequestOrigin(request)),
    307,
  );
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return redirectTo(request, "/login");

  const existingProfile = await getProfileByClerkId(userId);
  if (existingProfile) return redirectTo(request, getCanonicalUserPath(existingProfile));

  const clerkUser = await currentUser();
  const appUserId = clerkUser?.publicMetadata.appUserId;
  if (typeof appUserId === "string" && appUserId.trim()) {
    const linkedProfile = await linkClerkUserToProfile(appUserId, userId);
    if (linkedProfile) return redirectTo(request, getCanonicalUserPath(linkedProfile));
  }

  return redirectTo(request, "/onboarding");
}
