import { and, asc, desc, eq, inArray, lt, or } from "drizzle-orm";
import type { UploadedAsset } from "@/lib/cloudinary";
import { getDatabase } from "@/lib/db";
import {
  profileFollows,
  profiles,
  type WorkoutImageRow,
  type WorkoutRow,
  workoutImages,
  workouts,
} from "@/lib/db/schema";
import type { FeedItem } from "@/lib/social-types";
import { toPublicUser } from "@/lib/users";
import type { Workout, WorkoutImage } from "@/lib/workout-types";
import { toAppUser } from "./profiles";

export type StoredWorkoutImage = WorkoutImage & { publicId: string };
export type StoredWorkout = Workout & { storedImages: StoredWorkoutImage[] };

function toWorkoutImage(row: WorkoutImageRow): StoredWorkoutImage {
  return {
    src: row.secureUrl,
    publicId: row.publicId,
    format: row.format === "webp" ? "webp" : "avif",
    width: row.width,
    height: row.height,
    sizeBytes: row.sizeBytes,
  };
}

export async function listAttachedWorkoutImagePublicIds(publicIds: string[]) {
  if (publicIds.length === 0) return [];

  const rows = await getDatabase()
    .select({ publicId: workoutImages.publicId })
    .from(workoutImages)
    .where(inArray(workoutImages.publicId, publicIds));

  return rows.map((row) => row.publicId);
}

function toWorkout(row: WorkoutRow, images: WorkoutImageRow[]): StoredWorkout {
  const storedImages = images.sort((a, b) => a.position - b.position).map(toWorkoutImage);
  return {
    id: row.id,
    userId: row.profileId,
    date: row.date,
    type: row.type,
    startTime: row.startTime,
    endTime: row.endTime,
    durationMinutes: row.durationMinutes,
    note: row.note ?? undefined,
    images: storedImages.length > 0 ? storedImages : undefined,
    storedImages,
    createdAt: row.createdAt.toISOString(),
    isPublic: row.isPublic,
  };
}

async function loadImages(workoutIds: string[]) {
  if (workoutIds.length === 0) return [];
  return getDatabase()
    .select()
    .from(workoutImages)
    .where(inArray(workoutImages.workoutId, workoutIds))
    .orderBy(asc(workoutImages.position));
}

export async function listWorkoutsByProfile(
  profileId: string,
  visibility: "all" | "public" = "all",
) {
  const rows = await getDatabase()
    .select()
    .from(workouts)
    .where(
      visibility === "all"
        ? eq(workouts.profileId, profileId)
        : and(eq(workouts.profileId, profileId), eq(workouts.isPublic, true)),
    )
    .orderBy(asc(workouts.date), asc(workouts.startTime));
  const images = await loadImages(rows.map((row) => row.id));
  return rows.map((row) =>
    toWorkout(
      row,
      images.filter((image) => image.workoutId === row.id),
    ),
  );
}

export async function listFeedWorkouts(profileId: string, cursor?: string, limit = 20) {
  const followed = await getDatabase()
    .select({ id: profileFollows.followingProfileId })
    .from(profileFollows)
    .where(
      and(eq(profileFollows.followerProfileId, profileId), eq(profileFollows.status, "accepted")),
    );
  const followedIds = followed.map((row) => row.id);
  if (followedIds.length === 0) return { items: [] as FeedItem[], nextCursor: null };

  const [cursorDate, cursorId] = cursor ? cursor.split("|") : [];
  const cursorCondition =
    cursorDate && cursorId
      ? or(
          lt(workouts.createdAt, new Date(cursorDate)),
          and(eq(workouts.createdAt, new Date(cursorDate)), lt(workouts.id, cursorId)),
        )
      : undefined;
  const condition = and(
    inArray(workouts.profileId, followedIds),
    eq(workouts.isPublic, true),
    cursorCondition,
  );
  const rows = await getDatabase()
    .select()
    .from(workouts)
    .where(condition)
    .orderBy(desc(workouts.createdAt), desc(workouts.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const images = await loadImages(page.map((row) => row.id));
  const authorRows = await getDatabase()
    .select()
    .from(profiles)
    .where(inArray(profiles.id, [...new Set(page.map((row) => row.profileId))]));
  const authors = new Map(authorRows.map((row) => [row.id, toPublicUser(toAppUser(row))]));
  const items = page.flatMap((row): FeedItem[] => {
    const profile = authors.get(row.profileId);
    return profile
      ? [
          {
            profile,
            workout: toWorkout(
              row,
              images.filter((image) => image.workoutId === row.id),
            ),
          },
        ]
      : [];
  });
  const last = page.at(-1);
  return {
    items,
    nextCursor: rows.length > limit && last ? `${last.createdAt.toISOString()}|${last.id}` : null,
  };
}

export async function getOwnedWorkout(workoutId: string, profileId: string) {
  const [row] = await getDatabase()
    .select()
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .limit(1);
  if (!row || row.profileId !== profileId) return undefined;
  const images = await loadImages([row.id]);
  return toWorkout(row, images);
}

export async function insertWorkout(input: { workout: Workout; assets: UploadedAsset[] }) {
  return getDatabase().transaction(async (tx) => {
    const [row] = await tx
      .insert(workouts)
      .values({
        id: input.workout.id,
        profileId: input.workout.userId!,
        date: input.workout.date,
        type: input.workout.type,
        startTime: input.workout.startTime,
        endTime: input.workout.endTime,
        durationMinutes: input.workout.durationMinutes,
        note: input.workout.note || null,
        createdAt: new Date(input.workout.createdAt),
        isPublic: input.workout.isPublic,
      })
      .returning();

    const imageRows =
      input.assets.length > 0
        ? await tx
            .insert(workoutImages)
            .values(
              input.assets.map((asset, position) => ({
                workoutId: row.id,
                position,
                publicId: asset.publicId,
                secureUrl: asset.secureUrl,
                format: asset.format,
                width: asset.width,
                height: asset.height,
                sizeBytes: asset.sizeBytes,
              })),
            )
            .returning()
        : [];

    return toWorkout(row, imageRows);
  });
}

export async function updateWorkout(input: {
  existing: StoredWorkout;
  workout: Workout;
  retainedImages: StoredWorkoutImage[];
  newAssets: UploadedAsset[];
}) {
  return getDatabase().transaction(async (tx) => {
    const [row] = await tx
      .update(workouts)
      .set({
        date: input.workout.date,
        type: input.workout.type,
        startTime: input.workout.startTime,
        endTime: input.workout.endTime,
        durationMinutes: input.workout.durationMinutes,
        note: input.workout.note || null,
        isPublic: input.workout.isPublic,
      })
      .where(eq(workouts.id, input.existing.id))
      .returning();

    await tx.delete(workoutImages).where(eq(workoutImages.workoutId, input.existing.id));
    const allImages = [
      ...input.retainedImages.map((image) => ({
        publicId: image.publicId,
        secureUrl: image.src,
        format: image.format,
        width: image.width,
        height: image.height,
        sizeBytes: image.sizeBytes,
      })),
      ...input.newAssets,
    ];
    const imageRows =
      allImages.length > 0
        ? await tx
            .insert(workoutImages)
            .values(
              allImages.map((asset, position) => ({
                workoutId: row.id,
                position,
                publicId: asset.publicId,
                secureUrl: asset.secureUrl,
                format: asset.format,
                width: asset.width,
                height: asset.height,
                sizeBytes: asset.sizeBytes,
              })),
            )
            .returning()
        : [];

    return toWorkout(row, imageRows);
  });
}
