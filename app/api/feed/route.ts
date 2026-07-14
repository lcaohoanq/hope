import { NextResponse } from "next/server";
import { resolveOwner } from "@/lib/auth";
import { listFeedWorkouts } from "@/lib/repositories/workouts";

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
  const result = await listFeedWorkouts(owner.profile.id, cursor);
  return NextResponse.json({ success: true, ...result });
}
