import { NextResponse } from "next/server";
import { resolveOwner } from "@/lib/auth";
import { resolveProfileAccess } from "@/lib/profile-access";
import { getProfileById } from "@/lib/repositories/profiles";
import { listWorkoutActivityByProfile, type StoredWorkout } from "@/lib/repositories/workouts";
import { normalizeUserId } from "@/lib/users";
import type { Workout } from "@/lib/workout-types";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 12;

function publicWorkout(workout: StoredWorkout): Workout {
  return {
    id: workout.id,
    userId: workout.userId,
    date: workout.date,
    type: workout.type,
    startTime: workout.startTime,
    endTime: workout.endTime,
    durationMinutes: workout.durationMinutes,
    note: workout.note,
    images: workout.images,
    createdAt: workout.createdAt,
    isPublic: workout.isPublic,
  };
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const userId = normalizeUserId(searchParams.get("userId"));

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "A valid user is required." },
      { status: 400 },
    );
  }

  try {
    const profile = await getProfileById(userId);

    if (!profile) {
      return NextResponse.json({ success: false, error: "User was not found." }, { status: 404 });
    }

    const owner = await resolveOwner();
    const viewer = owner.status === "ready" ? owner.profile : undefined;
    const access = await resolveProfileAccess(profile, viewer);

    if (!access.canViewWorkouts) {
      return NextResponse.json(
        {
          success: false,
          error: "This profile is private.",
          reason: "private-profile",
          relationshipStatus: access.relationshipStatus,
        },
        { status: 403 },
      );
    }

    const limit = parseLimit(searchParams.get("limit"));
    const year = parseYear(searchParams.get("year"));
    const data = await listWorkoutActivityByProfile({
      profileId: profile.id,
      visibility: viewer?.id === profile.id ? "all" : "public",
      cursor: searchParams.get("cursor") ?? undefined,
      limit,
      year,
    });

    return NextResponse.json({
      workouts: data.workouts.map(publicWorkout),
      nextCursor: data.nextCursor,
    });
  } catch (error) {
    console.error("Unable to load workout activity.", error);
    return NextResponse.json(
      { success: false, error: "Unable to load workout activity." },
      { status: 500 },
    );
  }
}

function parseLimit(value: string | null) {
  const limit = value ? Number(value) : DEFAULT_LIMIT;

  if (!Number.isInteger(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(limit, 1), MAX_LIMIT);
}

function parseYear(value: string | null) {
  if (!value) {
    return undefined;
  }

  const year = Number(value);

  return Number.isInteger(year) && year >= 1900 && year <= 9999 ? year : undefined;
}
