import { NextResponse } from "next/server";
import { resolveOwner } from "@/lib/auth";
import { likeWorkout, unlikeWorkout } from "@/lib/repositories/workouts";

type WorkoutRouteContext = { params: Promise<{ workoutId: string }> };

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Authentication is required." },
    { status: 401 },
  );
}

function onboardingRequired() {
  return NextResponse.json(
    { success: false, error: "Complete onboarding first." },
    { status: 403 },
  );
}

function accessError(status: "not-found" | "forbidden") {
  return NextResponse.json(
    {
      success: false,
      error: status === "not-found" ? "Workout was not found." : "You cannot view this workout.",
    },
    { status: status === "not-found" ? 404 : 403 },
  );
}

export async function POST(_: Request, context: WorkoutRouteContext) {
  const owner = await resolveOwner();
  if (owner.status === "signed-out") return unauthorized();
  if (owner.status === "onboarding") return onboardingRequired();
  const { workoutId } = await context.params;
  const result = await likeWorkout(workoutId, owner.profile.id);
  if (result.status !== "ready") return accessError(result.status);
  return NextResponse.json({ success: true, ...result });
}

export async function DELETE(_: Request, context: WorkoutRouteContext) {
  const owner = await resolveOwner();
  if (owner.status === "signed-out") return unauthorized();
  if (owner.status === "onboarding") return onboardingRequired();
  const { workoutId } = await context.params;
  const result = await unlikeWorkout(workoutId, owner.profile.id);
  if (result.status !== "ready") return accessError(result.status);
  return NextResponse.json({ success: true, ...result });
}
