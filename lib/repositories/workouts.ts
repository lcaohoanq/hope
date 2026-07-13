import { asc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { workoutImages, workouts, type WorkoutImageRow, type WorkoutRow } from "@/lib/db/schema";
import type { UploadedAsset } from "@/lib/cloudinary";
import type { Workout, WorkoutImage } from "@/lib/workout-types";

export type StoredWorkoutImage = WorkoutImage & { publicId: string };
export type StoredWorkout = Workout & { storedImages: StoredWorkoutImage[] };

function toWorkoutImage(row: WorkoutImageRow): StoredWorkoutImage {
  return {
    src: row.secureUrl,
    publicId: row.publicId,
    format: "avif",
    width: row.width,
    height: row.height,
    sizeBytes: row.sizeBytes,
  };
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
  };
}

async function loadImages(workoutIds: string[]) {
  if (workoutIds.length === 0) return [];
  return getDatabase().select().from(workoutImages).where(inArray(workoutImages.workoutId, workoutIds)).orderBy(asc(workoutImages.position));
}

export async function listWorkoutsByProfile(profileId: string) {
  const rows = await getDatabase().select().from(workouts).where(eq(workouts.profileId, profileId)).orderBy(asc(workouts.date), asc(workouts.startTime));
  const images = await loadImages(rows.map((row) => row.id));
  return rows.map((row) => toWorkout(row, images.filter((image) => image.workoutId === row.id)));
}

export async function getOwnedWorkout(workoutId: string, profileId: string) {
  const [row] = await getDatabase().select().from(workouts).where(eq(workouts.id, workoutId)).limit(1);
  if (!row || row.profileId !== profileId) return undefined;
  const images = await loadImages([row.id]);
  return toWorkout(row, images);
}

export async function insertWorkout(input: {
  workout: Workout;
  assets: UploadedAsset[];
}) {
  return getDatabase().transaction(async (tx) => {
    const [row] = await tx.insert(workouts).values({
      id: input.workout.id,
      profileId: input.workout.userId!,
      date: input.workout.date,
      type: input.workout.type,
      startTime: input.workout.startTime,
      endTime: input.workout.endTime,
      durationMinutes: input.workout.durationMinutes,
      note: input.workout.note || null,
      createdAt: new Date(input.workout.createdAt),
    }).returning();

    const imageRows = input.assets.length > 0
      ? await tx.insert(workoutImages).values(input.assets.map((asset, position) => ({
          workoutId: row.id,
          position,
          publicId: asset.publicId,
          secureUrl: asset.secureUrl,
          format: asset.format,
          width: asset.width,
          height: asset.height,
          sizeBytes: asset.sizeBytes,
        }))).returning()
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
    const [row] = await tx.update(workouts).set({
      date: input.workout.date,
      type: input.workout.type,
      startTime: input.workout.startTime,
      endTime: input.workout.endTime,
      durationMinutes: input.workout.durationMinutes,
      note: input.workout.note || null,
    }).where(eq(workouts.id, input.existing.id)).returning();

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
    const imageRows = allImages.length > 0
      ? await tx.insert(workoutImages).values(allImages.map((asset, position) => ({
          workoutId: row.id,
          position,
          publicId: asset.publicId,
          secureUrl: asset.secureUrl,
          format: asset.format,
          width: asset.width,
          height: asset.height,
          sizeBytes: asset.sizeBytes,
        }))).returning()
      : [];

    return toWorkout(row, imageRows);
  });
}
