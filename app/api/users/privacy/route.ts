import { NextResponse } from "next/server";
import { resolveOwner } from "@/lib/auth";
import { updateProfilePrivacy } from "@/lib/repositories/social";
import { toPublicUser } from "@/lib/users";

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
  const isPrivate =
    body && typeof body === "object" ? (body as { isPrivate?: unknown }).isPrivate : undefined;
  if (typeof isPrivate !== "boolean")
    return NextResponse.json(
      { success: false, error: "isPrivate must be a boolean." },
      { status: 400 },
    );

  const profile = await updateProfilePrivacy(owner.profile.id, isPrivate);
  return profile
    ? NextResponse.json({ success: true, profile: toPublicUser(profile) })
    : NextResponse.json({ success: false, error: "Profile was not found." }, { status: 404 });
}
