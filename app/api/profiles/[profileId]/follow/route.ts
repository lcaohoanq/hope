import { NextResponse } from "next/server";
import { resolveOwner } from "@/lib/auth";
import { getProfileById } from "@/lib/repositories/profiles";
import { followProfile, unfollowOrCancel } from "@/lib/repositories/social";

type RouteContext = { params: Promise<{ profileId: string }> };

export async function POST(_: Request, { params }: RouteContext) {
  const owner = await resolveOwner();
  if (owner.status === "signed-out") return NextResponse.json({ success: false, error: "Authentication is required." }, { status: 401 });
  if (owner.status === "onboarding") return NextResponse.json({ success: false, error: "Complete onboarding first." }, { status: 403 });
  const { profileId } = await params;
  if (profileId === owner.profile.id) return NextResponse.json({ success: false, error: "You cannot follow yourself." }, { status: 400 });
  const target = await getProfileById(profileId);
  if (!target) return NextResponse.json({ success: false, error: "Profile was not found." }, { status: 404 });
  const status = await followProfile(owner.profile, target);
  return NextResponse.json({ success: true, relationshipStatus: status === "accepted" ? "following" : "pending" });
}

export async function DELETE(_: Request, { params }: RouteContext) {
  const owner = await resolveOwner();
  if (owner.status === "signed-out") return NextResponse.json({ success: false, error: "Authentication is required." }, { status: 401 });
  if (owner.status === "onboarding") return NextResponse.json({ success: false, error: "Complete onboarding first." }, { status: 403 });
  const { profileId } = await params;
  const removed = await unfollowOrCancel(owner.profile.id, profileId);
  return removed
    ? NextResponse.json({ success: true, relationshipStatus: "none" })
    : NextResponse.json({ success: false, error: "Follow relationship was not found." }, { status: 404 });
}
