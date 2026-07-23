import { clerkMiddleware } from "@clerk/nextjs/server";
import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";
import { requiresClerk } from "@/lib/route-access";

const withClerk = clerkMiddleware();

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const legacyProfile = request.nextUrl.pathname.match(/^\/(?:@|%40)([^/]+)\/?$/i);
  if (legacyProfile) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.pathname = `/${legacyProfile[1]}`;
    return NextResponse.redirect(canonicalUrl, 308);
  }

  if (!requiresClerk(request.nextUrl.pathname)) return NextResponse.next();
  return withClerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/:path*",
  ],
};
