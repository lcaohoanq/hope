import { NextResponse } from "next/server";
import { resolveOwner } from "@/lib/auth";
import { removeFollower } from "@/lib/repositories/social";

type RouteContext = { params: Promise<{ profileId: string; followerId: string }> };

export async function DELETE(_: Request, { params }: RouteContext) {
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
  const { profileId, followerId } = await params;
  if (profileId !== owner.profile.id)
    return NextResponse.json({ success: false, error: "Follower was not found." }, { status: 404 });
  const removed = await removeFollower(profileId, followerId);
  return removed
    ? NextResponse.json({ success: true })
    : NextResponse.json({ success: false, error: "Follower was not found." }, { status: 404 });
}
