import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  sanitizeNextPath,
} from "@/lib/auth";
import { authenticateUser } from "@/lib/users";

export const runtime = "nodejs";

type LoginRequest = {
  username?: unknown;
  password?: unknown;
  nextPath?: unknown;
};

export async function POST(request: Request) {
  let body: LoginRequest;

  try {
    body = (await request.json()) as LoginRequest;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Request body must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  const user = authenticateUser(username, password);

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "Username or password is incorrect.",
      },
      { status: 401 },
    );
  }

  const nextPath = sanitizeNextPath(body.nextPath);
  const response = NextResponse.json({
    success: true,
    redirectTo: nextPath === `/${user.slug}` ? nextPath : `/${user.slug}`,
  });

  response.cookies.set(AUTH_COOKIE_NAME, user.id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
