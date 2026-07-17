import { auth } from "@clerk/nextjs/server";
import { createApiClient } from "@hope/api-client";
import { type NextRequest, NextResponse } from "next/server";

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
  if (url.hostname === "0.0.0.0" || url.hostname === "::") url.hostname = "localhost";
  return url.origin;
}

function redirectTo(request: NextRequest, pathname: string) {
  return NextResponse.redirect(
    new URL(pathname, getConfiguredAppOrigin() ?? getRequestOrigin(request)),
    307,
  );
}

export async function GET(request: NextRequest) {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return redirectTo(request, "/login");

  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
  const client = createApiClient(apiUrl, token);
  const res = await client.users.me.$get();
  const me = (await res.json()) as { status: string; user: { username: string } | null };

  if (me.status === "ready" && me.user) {
    return redirectTo(request, `/@${me.user.username}`);
  }

  try {
    const linkRes = await client.users.profile.$post({ json: {} });
    const linkData = (await linkRes.json()) as { success: boolean; user?: { username: string } };
    if (linkData.success && linkData.user) {
      return redirectTo(request, `/@${linkData.user.username}`);
    }
  } catch {
    // Legacy linking failed, continue to onboarding
  }

  return redirectTo(request, "/onboarding");
}
