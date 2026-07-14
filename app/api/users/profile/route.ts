import { randomUUID } from "node:crypto";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { resolveOwner } from "@/lib/auth";
import { getProfileUpdateFieldErrors, profileUpdateSchema } from "@/lib/profile-update";
import {
  createProfile,
  getProfileByClerkId,
  linkClerkUserToProfile,
  updatePublicProfile,
} from "@/lib/repositories/profiles";
import { getCanonicalUserPath, normalizeUsername, toPublicUser } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { success: false, error: "Authentication is required." },
      { status: 401 },
    );

  const existing = await getProfileByClerkId(userId);
  if (existing) return NextResponse.json({ success: true, user: toPublicUser(existing) });

  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json(
      { success: false, error: "Clerk user was not found." },
      { status: 401 },
    );

  const appUserId = clerkUser.publicMetadata.appUserId;
  if (typeof appUserId === "string" && appUserId.trim()) {
    const linked = await linkClerkUserToProfile(appUserId, userId);
    if (linked) return NextResponse.json({ success: true, user: toPublicUser(linked) });
  }

  let body: { displayName?: unknown; birthYear?: unknown; avatarSeed?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const avatarSeed = typeof body.avatarSeed === "string" ? body.avatarSeed.trim() : "";
  const birthYear = Number(body.birthYear);
  const currentYear = new Date().getFullYear();
  const username = clerkUser.username ? normalizeUsername(clerkUser.username) : "";
  if (!username)
    return NextResponse.json(
      { success: false, error: "Choose a Clerk username before continuing." },
      { status: 400 },
    );
  if (
    displayName.length < 2 ||
    !avatarSeed ||
    !Number.isInteger(birthYear) ||
    birthYear < 1900 ||
    birthYear > currentYear
  ) {
    return NextResponse.json(
      { success: false, error: "Profile details are invalid." },
      { status: 400 },
    );
  }

  try {
    const profile = await createProfile({
      id: randomUUID(),
      clerkUserId: userId,
      username,
      displayName,
      birthYear,
      avatarSeed,
    });
    if (!profile) throw new Error("Profile creation did not return a profile.");
    return NextResponse.json({ success: true, user: toPublicUser(profile) });
  } catch (error) {
    console.error("Unable to create profile.", error);
    return NextResponse.json(
      { success: false, error: "That username is already in use." },
      { status: 409 },
    );
  }
}

export async function PATCH(request: Request) {
  const owner = await resolveOwner();

  if (owner.status === "signed-out") {
    return NextResponse.json(
      { success: false, error: "Authentication is required." },
      { status: 401 },
    );
  }

  if (owner.status === "onboarding") {
    return NextResponse.json(
      {
        success: false,
        error: "Complete onboarding before updating your profile.",
      },
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

  const result = profileUpdateSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Profile details are invalid.",
        fieldErrors: getProfileUpdateFieldErrors(result.error),
      },
      { status: 400 },
    );
  }

  try {
    const profile = await updatePublicProfile(owner.profile.id, result.data);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Profile was not found." },
        { status: 404 },
      );
    }

    const canonicalPath = getCanonicalUserPath(profile);
    revalidatePath(canonicalPath);
    revalidatePath("/settings/profile");

    return NextResponse.json({
      success: true,
      profile: toPublicUser(profile),
    });
  } catch (error) {
    console.error("Unable to update profile.", error);
    return NextResponse.json(
      { success: false, error: "Unable to update profile." },
      { status: 500 },
    );
  }
}
