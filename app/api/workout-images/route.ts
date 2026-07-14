import { NextResponse } from "next/server";
import { resolveOwner } from "@/lib/auth";
import { createWorkoutImageUploadTickets, isOwnedWorkoutImagePublicId } from "@/lib/cloudinary";
import { cleanupUnattachedWorkoutImageAssets } from "@/lib/workout-image-assets";
import { MAX_WORKOUT_IMAGES } from "@/lib/workout-images";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const owner = await resolveOwner();
  if (owner.status === "signed-out") return unauthorized();
  if (owner.status === "onboarding") return onboardingRequired();

  let body: { count?: unknown };

  try {
    body = (await request.json()) as { count?: unknown };
  } catch {
    return invalidRequest("Request body must be valid JSON.");
  }

  if (
    typeof body.count !== "number" ||
    !Number.isInteger(body.count) ||
    body.count < 1 ||
    body.count > MAX_WORKOUT_IMAGES
  ) {
    return invalidRequest(`Upload count must be between 1 and ${MAX_WORKOUT_IMAGES}.`);
  }

  try {
    return NextResponse.json({
      success: true,
      ...createWorkoutImageUploadTickets(owner.profile.id, body.count),
    });
  } catch (error) {
    console.error("Unable to create workout image upload tickets.", error);
    return NextResponse.json(
      { success: false, error: "Unable to prepare workout image uploads." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const owner = await resolveOwner();
  if (owner.status === "signed-out") return unauthorized();
  if (owner.status === "onboarding") return onboardingRequired();

  let body: { publicIds?: unknown };

  try {
    body = (await request.json()) as { publicIds?: unknown };
  } catch {
    return invalidRequest("Request body must be valid JSON.");
  }

  const publicIds = parsePublicIds(body.publicIds);

  if (!publicIds) {
    return invalidRequest(`Provide between 1 and ${MAX_WORKOUT_IMAGES} unique image ids.`);
  }

  if (!publicIds.every((publicId) => isOwnedWorkoutImagePublicId(owner.profile.id, publicId))) {
    return invalidRequest("One or more workout image ids are invalid.");
  }

  try {
    const cleanup = await cleanupUnattachedWorkoutImageAssets(owner.profile.id, publicIds);

    return NextResponse.json({ success: true, ...cleanup });
  } catch (error) {
    console.error("Unable to clean up workout image uploads.", error);
    return NextResponse.json(
      { success: false, error: "Unable to clean up workout image uploads." },
      { status: 500 },
    );
  }
}

function parsePublicIds(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_WORKOUT_IMAGES) return null;
  if (!value.every((publicId) => typeof publicId === "string" && publicId.length > 0)) return null;

  const publicIds = value as string[];
  return new Set(publicIds).size === publicIds.length ? publicIds : null;
}

function invalidRequest(error: string) {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Authentication is required." },
    { status: 401 },
  );
}

function onboardingRequired() {
  return NextResponse.json(
    { success: false, error: "Complete onboarding before uploading workout images." },
    { status: 403 },
  );
}
