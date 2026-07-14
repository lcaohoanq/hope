import { NextResponse } from "next/server";
import { resolveOwner } from "@/lib/auth";
import { resolveProfileAccess } from "@/lib/profile-access";
import { getProfileById } from "@/lib/repositories/profiles";
import { listConnections } from "@/lib/repositories/social";

type RouteContext = { params: Promise<{ profileId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { profileId } = await params;
  const target = await getProfileById(profileId);
  if (!target)
    return NextResponse.json({ success: false, error: "Profile was not found." }, { status: 404 });
  const owner = await resolveOwner();
  const viewer = owner.status === "ready" ? owner.profile : undefined;
  const access = await resolveProfileAccess(target, viewer);
  if (!access.canViewConnections)
    return NextResponse.json(
      { success: false, error: "This connection list is private." },
      { status: 403 },
    );
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  if (type !== "followers" && type !== "following")
    return NextResponse.json(
      { success: false, error: "Connection type is invalid." },
      { status: 400 },
    );
  const result = await listConnections(
    profileId,
    type,
    viewer?.id,
    url.searchParams.get("cursor") ?? undefined,
  );
  return NextResponse.json({ success: true, ...result });
}
