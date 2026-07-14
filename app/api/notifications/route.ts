import { NextResponse } from "next/server";
import { resolveOwner } from "@/lib/auth";
import { listNotifications, markNotificationsRead } from "@/lib/repositories/social";

export async function GET(request: Request) {
  const owner = await resolveOwner();
  if (owner.status === "signed-out")
    return NextResponse.json(
      { success: false, error: "Authentication is required." },
      { status: 401 },
    );
  if (owner.status === "onboarding")
    return NextResponse.json(
      { success: false, error: "Complete onboarding first." },
      { status: 403 },
    );
  const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined;
  return NextResponse.json({
    success: true,
    ...(await listNotifications(owner.profile.id, cursor)),
  });
}

export async function PATCH(request: Request) {
  const owner = await resolveOwner();
  if (owner.status === "signed-out")
    return NextResponse.json(
      { success: false, error: "Authentication is required." },
      { status: 401 },
    );
  if (owner.status === "onboarding")
    return NextResponse.json(
      { success: false, error: "Complete onboarding first." },
      { status: 403 },
    );
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }
  const notificationId =
    body &&
    typeof body === "object" &&
    typeof (body as { notificationId?: unknown }).notificationId === "string"
      ? (body as { notificationId: string }).notificationId
      : undefined;
  await markNotificationsRead(owner.profile.id, notificationId);
  return NextResponse.json({ success: true });
}
