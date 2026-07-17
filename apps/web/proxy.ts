import { clerkMiddleware } from "@clerk/nextjs/server";
import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

const clerkRoutes = [
  /^\/$/,
  /^\/(?:feed|notifications|onboarding)\/?$/,
  /^\/pricing(?:\/|$)/,
  /^\/workouts\/[^/]+\/?$/,
  /^\/(?:login|sign-up)(?:\/|$)/,
  /^\/auth\/(?:continue|resolve)\/?$/,
  /^\/settings\/profile\/?$/,
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
    const res = await fetch(`${API_URL}/profiles/by-username/${encodeURIComponent(segments[0])}`);
    return res.ok;
  } catch {
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
    "/__clerk/:path*",
  ],
};
