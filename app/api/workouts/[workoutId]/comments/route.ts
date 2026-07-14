import { NextResponse } from "next/server";
import { resolveOwner } from "@/lib/auth";
import { createWorkoutComment, listWorkoutComments } from "@/lib/repositories/workouts";
import { validateCommentBody } from "@/lib/social-validation";

type WorkoutRouteContext = { params: Promise<{ workoutId: string }> };

function accessError(status: "not-found" | "forbidden") {
  return NextResponse.json(
    {
      success: false,
      error: status === "not-found" ? "Workout was not found." : "You cannot view this workout.",
    },
    { status: status === "not-found" ? 404 : 403 },
  );
}

export async function GET(request: Request, context: WorkoutRouteContext) {
  const owner = await resolveOwner();
  const viewerProfileId = owner.status === "ready" ? owner.profile.id : undefined;
  const { workoutId } = await context.params;
  const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined;
  const result = await listWorkoutComments(workoutId, viewerProfileId, cursor);
  if (result.status !== "ready") return accessError(result.status);
  return NextResponse.json({ success: true, ...result });
}

export async function POST(request: Request, context: WorkoutRouteContext) {
  const owner = await resolveOwner();
  if (owner.status === "signed-out") {
    return NextResponse.json(
      { success: false, error: "Authentication is required." },
      { status: 401 },
    );
  }
  if (owner.status === "onboarding") {
    return NextResponse.json(
      { success: false, error: "Complete onboarding first." },
      { status: 403 },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }
  const validated = validateCommentBody(body);
  if (!validated.success) {
    return NextResponse.json({ success: false, error: validated.error }, { status: 400 });
  }
  const { workoutId } = await context.params;
  const result = await createWorkoutComment(workoutId, owner.profile.id, validated.body);
  if (result.status !== "ready") return accessError(result.status);
  return NextResponse.json({ success: true, comment: result.comment }, { status: 201 });
}
