import { clerkMiddleware } from "@clerk/nextjs/server";
import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";
import { getProfileByPath } from "@/lib/repositories/profiles";

const clerkRoutes = [
  /^\/$/,
  /^\/(?:feed|notifications|onboarding)\/?$/,
  /^\/(?:login|sign-up)(?:\/|$)/,
  /^\/auth\/(?:continue|resolve)\/?$/,
  /^\/settings\/profile\/?$/,
  /^\/api\/(?:feed|notifications|workouts)\/?$/,
  /^\/api\/users\/(?:avatar|privacy|profile|settings)\/?$/,
  /^\/api\/follow-requests\/[^/]+\/?$/,
  /^\/api\/profiles\/[^/]+\/(?:connections|follow)\/?$/,
  /^\/api\/profiles\/[^/]+\/followers\/[^/]+\/?$/,
  /^\/__clerk(?:\/|$)/,
];

const withClerk = clerkMiddleware();

async function isExistingProfileRoute(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const isProfilePage = segments.length === 1;
  const isConnectionsPage =
    segments.length === 2 && (segments[1] === "followers" || segments[1] === "following");

  if (!isProfilePage && !isConnectionsPage) return false;

  try {
    return Boolean(await getProfileByPath(decodeURIComponent(segments[0])));
  } catch {
    // Let the page handle database failures instead of turning a valid profile
    // into a misleading 404 at the proxy layer.
    return true;
  }
}

async function requiresClerk(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (clerkRoutes.some((route) => route.test(pathname))) return true;
  return isExistingProfileRoute(pathname);
}

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const legacyProfile = request.nextUrl.pathname.match(/^\/(?:@|%40)([^/]+)\/?$/i);
  if (legacyProfile) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.pathname = `/${legacyProfile[1]}`;
    return NextResponse.redirect(canonicalUrl, 308);
  }

  if (!(await requiresClerk(request))) return NextResponse.next();
  return withClerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
