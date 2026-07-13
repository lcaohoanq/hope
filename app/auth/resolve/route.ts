import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { getProfileByClerkId, linkClerkUserToProfile } from "@/lib/repositories/profiles";
import { getCanonicalUserPath } from "@/lib/users";

function redirectTo(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url), 307);
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
