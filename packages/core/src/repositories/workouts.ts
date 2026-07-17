import { getDatabase } from "@hope/db";
import {
  notifications,
  profileFollows,
  profiles,
  type WorkoutImageRow,
  type WorkoutRow,
  workoutComments,
  workoutImages,
  workoutLikes,
  workouts,
} from "@hope/db/schema";
import type { FeedItem, Workout, WorkoutComment, WorkoutImage } from "@hope/shared";
import { getActivityYearRange, toPublicUser } from "@hope/shared";
import { and, asc, count, desc, eq, gte, inArray, lt, lte, or, sql } from "drizzle-orm";
import type { UploadedAsset } from "../cloudinary";
import { toAppUser } from "./profiles";
import { getRelationshipStatus } from "./social";

export type StoredWorkoutImage = WorkoutImage & { publicId: string };
export type StoredWorkout = Workout & { storedImages: StoredWorkoutImage[] };

function toWorkoutImage(row: WorkoutImageRow): StoredWorkoutImage {
  return {
    src: row.secureUrl,
    publicId: row.publicId,
    format: row.format === "webp" || row.format === "jpg" ? row.format : "avif",
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

async function loadEngagement(
  workoutRows: WorkoutRow[],
  viewerProfileId?: string,
  previewLimit = 2,
) {
  const workoutIds = workoutRows.map((row) => row.id);
  if (workoutIds.length === 0) return new Map<string, Omit<FeedItem, "profile" | "workout">>();

  const db = getDatabase();
  const rankedComments = db
    .select({
      id: workoutComments.id,
      workoutId: workoutComments.workoutId,
      authorProfileId: workoutComments.authorProfileId,
      body: workoutComments.body,
      createdAt: workoutComments.createdAt,
      updatedAt: workoutComments.updatedAt,
      rank: sql<number>`row_number() over (partition by ${workoutComments.workoutId} order by ${workoutComments.createdAt} desc, ${workoutComments.id} desc)`.as(
        "rank",
      ),
    })
    .from(workoutComments)
    .where(inArray(workoutComments.workoutId, workoutIds))
    .as("ranked_workout_comments");

  const [likeCounts, commentCounts, viewerLikes, previewRows] = await Promise.all([
    db
      .select({ workoutId: workoutLikes.workoutId, value: count() })
      .from(workoutLikes)
      .where(inArray(workoutLikes.workoutId, workoutIds))
      .groupBy(workoutLikes.workoutId),
    db
      .select({ workoutId: workoutComments.workoutId, value: count() })
      .from(workoutComments)
      .where(inArray(workoutComments.workoutId, workoutIds))
      .groupBy(workoutComments.workoutId),
    viewerProfileId
      ? db
          .select({ workoutId: workoutLikes.workoutId })
          .from(workoutLikes)
          .where(
            and(
              inArray(workoutLikes.workoutId, workoutIds),
              eq(workoutLikes.profileId, viewerProfileId),
            ),
          )
      : Promise.resolve([]),
    db
      .select()
      .from(rankedComments)
      .where(lte(rankedComments.rank, previewLimit))
      .orderBy(asc(rankedComments.createdAt), asc(rankedComments.id)),
  ]);

  const authorIds = [...new Set(previewRows.map((row) => row.authorProfileId))];
  const authorRows = authorIds.length
    ? await db.select().from(profiles).where(inArray(profiles.id, authorIds))
    : [];
  const authors = new Map(authorRows.map((row) => [row.id, toPublicUser(toAppUser(row))]));
  const owners = new Map(workoutRows.map((row) => [row.id, row.profileId]));
  const comments = new Map<string, WorkoutComment[]>();
  for (const row of previewRows) {
    const author = authors.get(row.authorProfileId);
    if (!author) continue;
    const item: WorkoutComment = {
      id: row.id,
      workoutId: row.workoutId,
      author,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      viewerCanEdit: viewerProfileId === row.authorProfileId,
      viewerCanDelete:
        viewerProfileId === row.authorProfileId || viewerProfileId === owners.get(row.workoutId),
    };
    comments.set(row.workoutId, [...(comments.get(row.workoutId) ?? []), item]);
  }

  const likesByWorkout = new Map(likeCounts.map((row) => [row.workoutId, row.value]));
  const commentsByWorkout = new Map(commentCounts.map((row) => [row.workoutId, row.value]));
  const likedWorkouts = new Set(viewerLikes.map((row) => row.workoutId));
  return new Map(
    workoutIds.map((workoutId) => [
      workoutId,
      {
        likeCount: likesByWorkout.get(workoutId) ?? 0,
        commentCount: commentsByWorkout.get(workoutId) ?? 0,
        viewerHasLiked: likedWorkouts.has(workoutId),
        viewerCanInteract: Boolean(viewerProfileId),
        commentsPreview: comments.get(workoutId) ?? [],
      },
    ]),
  );
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

export async function getWorkoutCountByProfile(
  profileId: string,
  visibility: "all" | "public" = "all",
): Promise<number> {
  const result = await getDatabase()
    .select({ count: count() })
    .from(workouts)
    .where(
      visibility === "all"
        ? eq(workouts.profileId, profileId)
        : and(eq(workouts.profileId, profileId), eq(workouts.isPublic, true)),
    );
  return result[0]?.count ?? 0;
}

export async function listWorkoutActivityByProfile({
  profileId,
  visibility = "all",
  cursor,
  limit = 6,
  year,
}: {
  profileId: string;
  visibility?: "all" | "public";
  cursor?: string;
  limit?: number;
  year?: number;
}) {
  const [cursorTimestamp, cursorId] = cursor ? cursor.split("|") : [];
  const cursorCreatedAt = cursorTimestamp ? new Date(cursorTimestamp) : undefined;
  const cursorCondition =
    cursorCreatedAt && !Number.isNaN(cursorCreatedAt.getTime()) && cursorId
      ? or(
          lt(workouts.createdAt, cursorCreatedAt),
          and(eq(workouts.createdAt, cursorCreatedAt), lt(workouts.id, cursorId)),
        )
      : undefined;
  const yearRange = year ? getActivityYearRange(year) : undefined;
  const yearCondition = yearRange
    ? and(gte(workouts.createdAt, yearRange.start), lt(workouts.createdAt, yearRange.end))
    : undefined;
  const rows = await getDatabase()
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.profileId, profileId),
        visibility === "public" ? eq(workouts.isPublic, true) : undefined,
        yearCondition,
        cursorCondition,
      ),
    )
    .orderBy(desc(workouts.createdAt), desc(workouts.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const images = await loadImages(page.map((row) => row.id));
  const last = page.at(-1);

  return {
    workouts: page.map((row) =>
      toWorkout(
        row,
        images.filter((image) => image.workoutId === row.id),
      ),
    ),
    nextCursor: rows.length > limit && last ? `${last.createdAt.toISOString()}|${last.id}` : null,
  };
}

export async function listFeedWorkouts(profileId: string, cursor?: string, limit = 20) {
  const followed = await getDatabase()
    .select({ id: profileFollows.followingProfileId })
    .from(profileFollows)
    .where(
      and(eq(profileFollows.followerProfileId, profileId), eq(profileFollows.status, "accepted")),
    );
  const visibleProfileIds = [profileId, ...followed.map((row) => row.id)];

  const [cursorDate, cursorId] = cursor ? cursor.split("|") : [];
  const cursorCondition =
    cursorDate && cursorId
      ? or(
          lt(workouts.createdAt, new Date(cursorDate)),
          and(eq(workouts.createdAt, new Date(cursorDate)), lt(workouts.id, cursorId)),
        )
      : undefined;
  const condition = and(
    inArray(workouts.profileId, visibleProfileIds),
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
  const engagement = await loadEngagement(page, profileId);
  const items = page.flatMap((row): FeedItem[] => {
    const profile = authors.get(row.profileId);
    const social = engagement.get(row.id);
    return profile && social
      ? [
          {
            profile,
            workout: toWorkout(
              row,
              images.filter((image) => image.workoutId === row.id),
            ),
            ...social,
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

export async function getWorkoutAccess(workoutId: string, viewerProfileId?: string) {
  const [row] = await getDatabase()
    .select()
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .limit(1);
  if (!row?.isPublic) return { status: "not-found" as const };

  const [profileRow] = await getDatabase()
    .select()
    .from(profiles)
    .where(eq(profiles.id, row.profileId))
    .limit(1);
  if (!profileRow) return { status: "not-found" as const };
  const profile = toAppUser(profileRow);
  if (profile.isPrivate) {
    const relationship = await getRelationshipStatus(viewerProfileId, profile.id);
    if (relationship !== "self" && relationship !== "following") {
      return { status: "forbidden" as const };
    }
  }
  return { status: "ready" as const, row, profile };
}

export async function getWorkoutPost(workoutId: string, viewerProfileId?: string) {
  const access = await getWorkoutAccess(workoutId, viewerProfileId);
  if (access.status !== "ready") return access;
  const [images, engagement] = await Promise.all([
    loadImages([workoutId]),
    loadEngagement([access.row], viewerProfileId),
  ]);
  const social = engagement.get(workoutId);
  if (!social) return { status: "not-found" as const };
  return {
    status: "ready" as const,
    item: {
      profile: toPublicUser(access.profile),
      workout: toWorkout(access.row, images),
      ...social,
    } satisfies FeedItem,
  };
}

export async function likeWorkout(workoutId: string, profileId: string) {
  const access = await getWorkoutAccess(workoutId, profileId);
  if (access.status !== "ready") return access;
  await getDatabase().transaction(async (tx) => {
    const inserted = await tx
      .insert(workoutLikes)
      .values({ workoutId, profileId })
      .onConflictDoNothing()
      .returning({ id: workoutLikes.id });
    if (inserted.length > 0 && access.row.profileId !== profileId) {
      await tx
        .insert(notifications)
        .values({
          id: crypto.randomUUID(),
          recipientProfileId: access.row.profileId,
          actorProfileId: profileId,
          workoutId,
          type: "workout_liked",
        })
        .onConflictDoNothing();
    }
  });
  const [summary] = await getDatabase()
    .select({ value: count() })
    .from(workoutLikes)
    .where(eq(workoutLikes.workoutId, workoutId));
  return { status: "ready" as const, likeCount: summary.value, viewerHasLiked: true };
}

export async function unlikeWorkout(workoutId: string, profileId: string) {
  const access = await getWorkoutAccess(workoutId, profileId);
  if (access.status !== "ready") return access;
  await getDatabase().transaction(async (tx) => {
    await tx
      .delete(workoutLikes)
      .where(and(eq(workoutLikes.workoutId, workoutId), eq(workoutLikes.profileId, profileId)));
    await tx
      .delete(notifications)
      .where(
        and(
          eq(notifications.type, "workout_liked"),
          eq(notifications.workoutId, workoutId),
          eq(notifications.actorProfileId, profileId),
        ),
      );
  });
  const [summary] = await getDatabase()
    .select({ value: count() })
    .from(workoutLikes)
    .where(eq(workoutLikes.workoutId, workoutId));
  return { status: "ready" as const, likeCount: summary.value, viewerHasLiked: false };
}

function toComment(
  row: typeof workoutComments.$inferSelect,
  author: ReturnType<typeof toPublicUser>,
  viewerProfileId: string | undefined,
  workoutOwnerProfileId: string,
): WorkoutComment {
  return {
    id: row.id,
    workoutId: row.workoutId,
    author,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    viewerCanEdit: viewerProfileId === row.authorProfileId,
    viewerCanDelete:
      viewerProfileId === row.authorProfileId || viewerProfileId === workoutOwnerProfileId,
  };
}

export async function listWorkoutComments(
  workoutId: string,
  viewerProfileId?: string,
  cursor?: string,
  limit = 20,
) {
  const access = await getWorkoutAccess(workoutId, viewerProfileId);
  if (access.status !== "ready") return access;
  const [cursorDate, cursorId] = cursor ? cursor.split("|") : [];
  const cursorCondition =
    cursorDate && cursorId
      ? or(
          lt(workoutComments.createdAt, new Date(cursorDate)),
          and(
            eq(workoutComments.createdAt, new Date(cursorDate)),
            lt(workoutComments.id, cursorId),
          ),
        )
      : undefined;
  const rows = await getDatabase()
    .select()
    .from(workoutComments)
    .where(and(eq(workoutComments.workoutId, workoutId), cursorCondition))
    .orderBy(desc(workoutComments.createdAt), desc(workoutComments.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const authorIds = [...new Set(page.map((row) => row.authorProfileId))];
  const authorRows = authorIds.length
    ? await getDatabase().select().from(profiles).where(inArray(profiles.id, authorIds))
    : [];
  const authors = new Map(authorRows.map((row) => [row.id, toPublicUser(toAppUser(row))]));
  const items = page
    .flatMap((row) => {
      const author = authors.get(row.authorProfileId);
      return author ? [toComment(row, author, viewerProfileId, access.row.profileId)] : [];
    })
    .reverse();
  const oldest = page.at(-1);
  return {
    status: "ready" as const,
    items,
    nextCursor:
      rows.length > limit && oldest ? `${oldest.createdAt.toISOString()}|${oldest.id}` : null,
  };
}

export async function createWorkoutComment(
  workoutId: string,
  authorProfileId: string,
  body: string,
) {
  const access = await getWorkoutAccess(workoutId, authorProfileId);
  if (access.status !== "ready") return access;
  const row = await getDatabase().transaction(async (tx) => {
    const [comment] = await tx
      .insert(workoutComments)
      .values({ id: crypto.randomUUID(), workoutId, authorProfileId, body })
      .returning();
    if (access.row.profileId !== authorProfileId) {
      await tx.insert(notifications).values({
        id: crypto.randomUUID(),
        recipientProfileId: access.row.profileId,
        actorProfileId: authorProfileId,
        workoutId,
        commentId: comment.id,
        type: "workout_commented",
      });
    }
    return comment;
  });
  const [authorRow] = await getDatabase()
    .select()
    .from(profiles)
    .where(eq(profiles.id, authorProfileId))
    .limit(1);
  if (!authorRow) return { status: "not-found" as const };
  return {
    status: "ready" as const,
    comment: toComment(
      row,
      toPublicUser(toAppUser(authorRow)),
      authorProfileId,
      access.row.profileId,
    ),
  };
}

export async function updateWorkoutComment(commentId: string, profileId: string, body: string) {
  const [existing] = await getDatabase()
    .select()
    .from(workoutComments)
    .where(eq(workoutComments.id, commentId))
    .limit(1);
  if (!existing) return { status: "not-found" as const };
  if (existing.authorProfileId !== profileId) return { status: "forbidden" as const };
  const access = await getWorkoutAccess(existing.workoutId, profileId);
  if (access.status !== "ready") return access;
  const [row] = await getDatabase()
    .update(workoutComments)
    .set({ body, updatedAt: new Date() })
    .where(eq(workoutComments.id, commentId))
    .returning();
  const [authorRow] = await getDatabase()
    .select()
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);
  if (!row || !authorRow) return { status: "not-found" as const };
  return {
    status: "ready" as const,
    comment: toComment(row, toPublicUser(toAppUser(authorRow)), profileId, access.row.profileId),
  };
}

export async function deleteWorkoutComment(commentId: string, profileId: string) {
  const [existing] = await getDatabase()
    .select()
    .from(workoutComments)
    .where(eq(workoutComments.id, commentId))
    .limit(1);
  if (!existing) return { status: "not-found" as const };
  const [workout] = await getDatabase()
    .select({ profileId: workouts.profileId })
    .from(workouts)
    .where(eq(workouts.id, existing.workoutId))
    .limit(1);
  if (!workout) return { status: "not-found" as const };
  if (existing.authorProfileId !== profileId && workout.profileId !== profileId) {
    return { status: "forbidden" as const };
  }
  await getDatabase().delete(workoutComments).where(eq(workoutComments.id, commentId));
  return { status: "ready" as const, workoutId: existing.workoutId };
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
