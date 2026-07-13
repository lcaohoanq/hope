import { NextResponse } from "next/server";
import { resolveOwner } from "@/lib/auth";
import { respondToFollowRequest } from "@/lib/repositories/social";

type RouteContext = { params: Promise<{ profileId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const owner = await resolveOwner();
  if (owner.status === "signed-out") return NextResponse.json({ success: false, error: "Authentication is required." }, { status: 401 });
  if (owner.status === "onboarding") return NextResponse.json({ success: false, error: "Complete onboarding first." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: "Request body must be valid JSON." }, { status: 400 }); }
  const action = body && typeof body === "object" ? (body as { action?: unknown }).action : undefined;
  if (action !== "accept" && action !== "decline") return NextResponse.json({ success: false, error: "Action must be accept or decline." }, { status: 400 });
  const { profileId } = await params;
  const updated = await respondToFollowRequest(owner.profile.id, profileId, action);
  return updated
    ? NextResponse.json({ success: true })
    : NextResponse.json({ success: false, error: "Follow request was not found." }, { status: 404 });
}
