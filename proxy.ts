import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Profiles and reads stay public. Mutation handlers resolve the Clerk owner.
export default clerkMiddleware((_auth, request) => {
  const legacyProfile = request.nextUrl.pathname.match(/^\/(?:@|%40)([^/]+)\/?$/i);
  if (!legacyProfile) return;

  const canonicalUrl = request.nextUrl.clone();
  canonicalUrl.pathname = `/${legacyProfile[1]}`;
  return NextResponse.redirect(canonicalUrl, 308);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
