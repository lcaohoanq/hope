import { promises as fs } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { eq, sql } from "drizzle-orm";
import { cleanupUploadedAssets, uploadImageBuffer, type UploadedAsset } from "@/lib/cloudinary";
import { closeDatabase, getDatabase } from "@/lib/db";
import { profiles, workoutImages, workouts } from "@/lib/db/schema";
import type { AppUser } from "@/lib/users";
import type { WorkoutData } from "@/lib/workout-types";
import { validateWorkoutData } from "@/lib/workout-utils";

loadEnvConfig(process.cwd());

type SnapshotProfile = Omit<AppUser, "slug" | "clerkUserId" | "avatarPublicId">;
type ManifestEntry = { appUserId: string; email: string };
type MigratedAsset = UploadedAsset & { source: string };

const dryRun = process.argv.includes("--dry-run");
const snapshotPath = path.join(process.cwd(), "data/profiles.snapshot.json");
const workoutsPath = path.join(process.cwd(), "data/workouts.json");
const manifestPath = path.join(process.cwd(), ".migration-users.json");

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

function localUploadPath(src: string) {
  if (!src.startsWith("/uploads/") || src.includes("..")) throw new Error(`Unsafe asset path: ${src}`);
  return path.join(process.cwd(), "public", src);
}

async function readManifest(required: boolean) {
  try {
    return await readJson<ManifestEntry[]>(manifestPath);
  } catch (error) {
    if (required) throw new Error(".migration-users.json is required for a live migration.", { cause: error });
    return [];
  }
}

async function validateSources(profileRows: SnapshotProfile[], data: WorkoutData, manifest: ManifestEntry[]) {
  const profileIds = new Set<string>();
  const usernames = new Set<string>();
  const workoutIds = new Set<string>();
  const manifestIds = new Set<string>();
  const missingAssets: string[] = [];

  for (const profile of profileRows) {
    if (profileIds.has(profile.id)) throw new Error(`Duplicate profile id: ${profile.id}`);
    if (usernames.has(profile.username)) throw new Error(`Duplicate username: ${profile.username}`);
    profileIds.add(profile.id);
    usernames.add(profile.username);
    if (profile.avatarUrl) {
      try { await fs.access(localUploadPath(profile.avatarUrl)); } catch { missingAssets.push(profile.avatarUrl); }
    }
  }
  for (const workout of data.workouts) {
    if (workoutIds.has(workout.id)) throw new Error(`Duplicate workout id: ${workout.id}`);
    if (!workout.userId || !profileIds.has(workout.userId)) throw new Error(`Workout ${workout.id} references unknown profile ${workout.userId}.`);
    workoutIds.add(workout.id);
    for (const image of workout.images ?? []) {
      try { await fs.access(localUploadPath(image.src)); } catch { missingAssets.push(image.src); }
    }
  }
  for (const entry of manifest) {
    if (!profileIds.has(entry.appUserId)) throw new Error(`Manifest references unknown profile ${entry.appUserId}.`);
    if (manifestIds.has(entry.appUserId)) throw new Error(`Duplicate manifest profile ${entry.appUserId}.`);
    if (!entry.email.includes("@")) throw new Error(`Invalid migration email for ${entry.appUserId}.`);
    manifestIds.add(entry.appUserId);
  }
  if (missingAssets.length > 0) throw new Error(`Missing source assets:\n${missingAssets.join("\n")}`);

  return {
    profileCount: profileRows.length,
    workoutCount: data.workouts.length,
    imageCount: data.workouts.reduce((count, workout) => count + (workout.images?.length ?? 0), 0),
    avatarCount: profileRows.filter((profile) => profile.avatarUrl).length,
    invitationCount: manifest.length,
  };
}

async function uploadLegacyAsset(source: string, publicId: string) {
  const buffer = await fs.readFile(localUploadPath(source));
  return { ...(await uploadImageBuffer(buffer, publicId)), source } satisfies MigratedAsset;
}

async function linkOrInviteUsers(manifest: ManifestEntry[]) {
  if (manifest.length === 0) return;

  const { clerkClient } = await import("@clerk/nextjs/server");
  const clerk = await clerkClient();
  const db = getDatabase();
  for (const entry of manifest) {
    const users = await clerk.users.getUserList({ emailAddress: [entry.email], limit: 1 });
    const existing = users.data[0];
    if (existing) {
      await clerk.users.updateUserMetadata(existing.id, {
        publicMetadata: { ...existing.publicMetadata, appUserId: entry.appUserId },
      });
      await db.update(profiles).set({ clerkUserId: existing.id, updatedAt: new Date() }).where(eq(profiles.id, entry.appUserId));
      console.log(`Linked existing Clerk user to ${entry.appUserId}.`);
      continue;
    }

    try {
      await clerk.invitations.createInvitation({
        emailAddress: entry.email,
        publicMetadata: { appUserId: entry.appUserId },
        redirectUrl: process.env.NEXT_PUBLIC_APP_URL ? new URL("/sign-up", process.env.NEXT_PUBLIC_APP_URL).toString() : undefined,
      });
      console.log(`Created Clerk invitation for ${entry.appUserId}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.toLowerCase().includes("already")) throw error;
      console.log(`Invitation already exists for ${entry.appUserId}; continuing.`);
    }
  }
}

async function migrate() {
  const profileRows = await readJson<SnapshotProfile[]>(snapshotPath);
  const workoutData = validateWorkoutData(await readJson<unknown>(workoutsPath));
  const manifest = await readManifest(!dryRun);
  const summary = await validateSources(profileRows, workoutData, manifest);
  console.log(`Validated ${summary.profileCount} profiles, ${summary.workoutCount} workouts, ${summary.avatarCount} avatars, and ${summary.imageCount} workout images.`);
  if (dryRun) {
    console.log(`Dry run complete. ${summary.invitationCount} invitation mappings found; no external state changed.`);
    return;
  }

  const uploaded: MigratedAsset[] = [];
  let databaseCommitted = false;
  try {
    const avatars = new Map<string, MigratedAsset>();
    for (const profile of profileRows) {
      if (!profile.avatarUrl) continue;
      const asset = await uploadLegacyAsset(profile.avatarUrl, `hope/legacy/avatars/${profile.id}`);
      uploaded.push(asset);
      avatars.set(profile.id, asset);
    }

    const workoutAssets = new Map<string, MigratedAsset[]>();
    for (const workout of workoutData.workouts) {
      const assets: MigratedAsset[] = [];
      for (const [position, image] of (workout.images ?? []).entries()) {
        const asset = await uploadLegacyAsset(image.src, `hope/legacy/workouts/${workout.userId}/${workout.id}/${position}`);
        uploaded.push(asset);
        assets.push(asset);
      }
      workoutAssets.set(workout.id, assets);
    }

    const db = getDatabase();
    await db.transaction(async (tx) => {
      for (const profile of profileRows) {
        const avatar = avatars.get(profile.id);
        await tx.insert(profiles).values({
          id: profile.id,
          username: profile.username.toLowerCase(),
          plan: profile.plan,
          displayName: profile.displayName,
          birthYear: profile.birthYear,
          avatarSeed: profile.avatarSeed,
          avatarUrl: avatar?.secureUrl,
          avatarPublicId: avatar?.publicId,
          bio: profile.bio,
          location: profile.location,
          pronouns: profile.pronouns,
          preferredLanguage: profile.preferredLanguage,
          socialLinks: profile.socialLinks,
          website: profile.website,
          settings: profile.settings,
          reminderEnabled: profile.reminderEnabled ?? false,
        }).onConflictDoUpdate({
          target: profiles.id,
          set: {
            username: profile.username.toLowerCase(), plan: profile.plan, displayName: profile.displayName,
            birthYear: profile.birthYear, avatarSeed: profile.avatarSeed, avatarUrl: avatar?.secureUrl,
            avatarPublicId: avatar?.publicId, bio: profile.bio, location: profile.location,
            pronouns: profile.pronouns, preferredLanguage: profile.preferredLanguage,
            socialLinks: profile.socialLinks, website: profile.website, settings: profile.settings,
            reminderEnabled: profile.reminderEnabled ?? false, updatedAt: new Date(),
          },
        });
      }

      for (const workout of workoutData.workouts) {
        await tx.insert(workouts).values({
          id: workout.id,
          profileId: workout.userId!,
          date: workout.date,
          type: workout.type,
          startTime: workout.startTime,
          endTime: workout.endTime,
          durationMinutes: workout.durationMinutes,
          note: workout.note,
          createdAt: new Date(workout.createdAt),
        }).onConflictDoUpdate({
          target: workouts.id,
          set: { profileId: workout.userId!, date: workout.date, type: workout.type, startTime: workout.startTime, endTime: workout.endTime, durationMinutes: workout.durationMinutes, note: workout.note },
        });
        await tx.delete(workoutImages).where(eq(workoutImages.workoutId, workout.id));
        const assets = workoutAssets.get(workout.id) ?? [];
        if (assets.length > 0) {
          await tx.insert(workoutImages).values(assets.map((asset, position) => ({
            workoutId: workout.id, position, publicId: asset.publicId, secureUrl: asset.secureUrl,
            format: asset.format, width: asset.width, height: asset.height, sizeBytes: asset.sizeBytes,
          })));
        }
      }
    });
    databaseCommitted = true;

    await linkOrInviteUsers(manifest);
    const [profileCount] = await getDatabase().select({ count: sql<number>`count(*)::int` }).from(profiles);
    const [workoutCount] = await getDatabase().select({ count: sql<number>`count(*)::int` }).from(workouts);
    const [imageCount] = await getDatabase().select({ count: sql<number>`count(*)::int` }).from(workoutImages);
    console.log(`Destination totals: ${profileCount.count} profiles, ${workoutCount.count} workouts, ${imageCount.count} workout images.`);
    if (profileCount.count < summary.profileCount || workoutCount.count < summary.workoutCount || imageCount.count < summary.imageCount) {
      throw new Error("Destination count verification failed.");
    }
  } catch (error) {
    if (!databaseCommitted) {
      await cleanupUploadedAssets(uploaded.map((asset) => asset.publicId));
    }
    throw error;
  }
}

migrate()
  .then(() => closeDatabase())
  .catch(async (error) => {
    try {
      await closeDatabase();
    } catch (closeError) {
      console.error("Failed to close the database connection:", closeError);
    }
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
