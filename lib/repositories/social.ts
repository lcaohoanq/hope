import { randomUUID } from "node:crypto";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { type NotificationType, notifications, profileFollows, profiles } from "@/lib/db/schema";
import type {
  AppNotification,
  ConnectionItem,
  RelationshipStatus,
  SocialSummary,
} from "@/lib/social-types";
import type { AppUser } from "@/lib/users";
import { toPublicUser } from "@/lib/users";
import { toAppUser } from "./profiles";

export async function getRelationshipStatus(
  viewerProfileId: string | undefined,
  targetProfileId: string,
): Promise<RelationshipStatus> {
  if (!viewerProfileId) return "none";
  if (viewerProfileId === targetProfileId) return "self";

  const [row] = await getDatabase()
    .select({ status: profileFollows.status })
    .from(profileFollows)
    .where(
      and(
        eq(profileFollows.followerProfileId, viewerProfileId),
        eq(profileFollows.followingProfileId, targetProfileId),
      ),
    )
    .limit(1);

  return row?.status === "accepted" ? "following" : row?.status === "pending" ? "pending" : "none";
}

export async function getSocialSummary(
  target: AppUser,
  viewerProfileId?: string,
): Promise<SocialSummary> {
  const db = getDatabase();
  const [[followers], [following], relationshipStatus] = await Promise.all([
    db
      .select({ value: count() })
      .from(profileFollows)
      .where(
        and(
          eq(profileFollows.followingProfileId, target.id),
          eq(profileFollows.status, "accepted"),
        ),
      ),
    db
      .select({ value: count() })
      .from(profileFollows)
      .where(
        and(eq(profileFollows.followerProfileId, target.id), eq(profileFollows.status, "accepted")),
      ),
    getRelationshipStatus(viewerProfileId, target.id),
  ]);
  const hasPrivateAccess = relationshipStatus === "self" || relationshipStatus === "following";

  return {
    followersCount: followers.value,
    followingCount: following.value,
    relationshipStatus,
    canViewConnections: !target.isPrivate || hasPrivateAccess,
    canViewWorkouts: !target.isPrivate || hasPrivateAccess,
  };
}

export async function followProfile(viewer: AppUser, target: AppUser) {
  if (viewer.id === target.id) throw new Error("self-follow");

  return getDatabase().transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(profileFollows)
      .where(
        and(
          eq(profileFollows.followerProfileId, viewer.id),
          eq(profileFollows.followingProfileId, target.id),
        ),
      )
      .limit(1);
    if (existing) return existing.status;

    const status = target.isPrivate ? ("pending" as const) : ("accepted" as const);
    const [follow] = await tx
      .insert(profileFollows)
      .values({
        followerProfileId: viewer.id,
        followingProfileId: target.id,
        status,
        acceptedAt: status === "accepted" ? new Date() : null,
      })
      .returning();
    await tx.insert(notifications).values({
      id: randomUUID(),
      recipientProfileId: target.id,
      actorProfileId: viewer.id,
      type: status === "pending" ? "follow_request" : "new_follower",
    });
    return follow.status;
  });
}

export async function unfollowOrCancel(viewerProfileId: string, targetProfileId: string) {
  return getDatabase().transaction(async (tx) => {
    const deleted = await tx
      .delete(profileFollows)
      .where(
        and(
          eq(profileFollows.followerProfileId, viewerProfileId),
          eq(profileFollows.followingProfileId, targetProfileId),
        ),
      )
      .returning();
    await tx
      .delete(notifications)
      .where(
        and(
          eq(notifications.recipientProfileId, targetProfileId),
          eq(notifications.actorProfileId, viewerProfileId),
          eq(notifications.type, "follow_request"),
        ),
      );
    return deleted.length > 0;
  });
}

export async function respondToFollowRequest(
  ownerProfileId: string,
  requesterProfileId: string,
  action: "accept" | "decline",
) {
  return getDatabase().transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(profileFollows)
      .where(
        and(
          eq(profileFollows.followerProfileId, requesterProfileId),
          eq(profileFollows.followingProfileId, ownerProfileId),
          eq(profileFollows.status, "pending"),
        ),
      )
      .limit(1);
    if (!request) return false;

    if (action === "accept") {
      await tx
        .update(profileFollows)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(eq(profileFollows.id, request.id));
      await tx.insert(notifications).values({
        id: randomUUID(),
        recipientProfileId: requesterProfileId,
        actorProfileId: ownerProfileId,
        type: "follow_accepted",
      });
    } else {
      await tx.delete(profileFollows).where(eq(profileFollows.id, request.id));
    }
    await tx
      .delete(notifications)
      .where(
        and(
          eq(notifications.recipientProfileId, ownerProfileId),
          eq(notifications.actorProfileId, requesterProfileId),
          eq(notifications.type, "follow_request"),
        ),
      );
    return true;
  });
}

export async function removeFollower(ownerProfileId: string, followerProfileId: string) {
  const rows = await getDatabase()
    .delete(profileFollows)
    .where(
      and(
        eq(profileFollows.followerProfileId, followerProfileId),
        eq(profileFollows.followingProfileId, ownerProfileId),
        eq(profileFollows.status, "accepted"),
      ),
    )
    .returning();
  return rows.length > 0;
}

export async function updateProfilePrivacy(profileId: string, isPrivate: boolean) {
  return getDatabase().transaction(async (tx) => {
    const [profile] = await tx
      .update(profiles)
      .set({ isPrivate, updatedAt: new Date() })
      .where(eq(profiles.id, profileId))
      .returning();
    if (!profile) return undefined;

    if (!isPrivate) {
      const pending = await tx
        .update(profileFollows)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(
          and(
            eq(profileFollows.followingProfileId, profileId),
            eq(profileFollows.status, "pending"),
          ),
        )
        .returning();
      if (pending.length > 0) {
        await tx.insert(notifications).values(
          pending.map((follow) => ({
            id: randomUUID(),
            recipientProfileId: follow.followerProfileId,
            actorProfileId: profileId,
            type: "follow_accepted" as const,
          })),
        );
        await tx
          .delete(notifications)
          .where(
            and(
              eq(notifications.recipientProfileId, profileId),
              eq(notifications.type, "follow_request"),
            ),
          );
      }
    }
    return toAppUser(profile);
  });
}

export async function listConnections(
  targetProfileId: string,
  type: "followers" | "following",
  viewerProfileId?: string,
  cursor?: string,
  limit = 30,
) {
  const rows = await getDatabase()
    .select()
    .from(profileFollows)
    .where(
      and(
        eq(
          type === "followers"
            ? profileFollows.followingProfileId
            : profileFollows.followerProfileId,
          targetProfileId,
        ),
        eq(profileFollows.status, "accepted"),
      ),
    );
  const ids = rows.map((row) =>
    type === "followers" ? row.followerProfileId : row.followingProfileId,
  );
  const profileRows = ids.length
    ? await getDatabase().select().from(profiles).where(inArray(profiles.id, ids))
    : [];
  const sorted = profileRows.map(toAppUser).sort((a, b) => a.username.localeCompare(b.username));
  const start = cursor
    ? Math.max(0, sorted.findIndex((profile) => profile.username === cursor) + 1)
    : 0;
  const page = sorted.slice(start, start + limit);
  const items: ConnectionItem[] = await Promise.all(
    page.map(async (profile) => ({
      profile: toPublicUser(profile),
      relationshipStatus: await getRelationshipStatus(viewerProfileId, profile.id),
    })),
  );
  return {
    items,
    nextCursor: start + limit < sorted.length ? (page.at(-1)?.username ?? null) : null,
  };
}

export async function listNotifications(profileId: string, cursor?: string, limit = 20) {
  const allRows = await getDatabase()
    .select()
    .from(notifications)
    .where(eq(notifications.recipientProfileId, profileId))
    .orderBy(desc(notifications.createdAt), desc(notifications.id));
  const start = cursor ? Math.max(0, allRows.findIndex((row) => row.id === cursor) + 1) : 0;
  const rows = allRows.slice(start, start + limit);
  const actorIds = rows.flatMap((row) => (row.actorProfileId ? [row.actorProfileId] : []));
  const actors = actorIds.length
    ? await getDatabase().select().from(profiles).where(inArray(profiles.id, actorIds))
    : [];
  const actorMap = new Map(actors.map((row) => [row.id, toPublicUser(toAppUser(row))]));
  const items: AppNotification[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    actor: row.actorProfileId ? actorMap.get(row.actorProfileId) : undefined,
    isRead: Boolean(row.readAt),
    createdAt: row.createdAt.toISOString(),
  }));
  const [unread] = await getDatabase()
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.recipientProfileId, profileId), isNull(notifications.readAt)));
  return {
    items,
    unreadCount: unread.value,
    nextCursor: start + limit < allRows.length ? (rows.at(-1)?.id ?? null) : null,
  };
}

export async function markNotificationsRead(profileId: string, notificationId?: string) {
  const condition = notificationId
    ? and(eq(notifications.recipientProfileId, profileId), eq(notifications.id, notificationId))
    : and(eq(notifications.recipientProfileId, profileId), isNull(notifications.readAt));
  await getDatabase().update(notifications).set({ readAt: new Date() }).where(condition);
}

export function notificationType(value: string): value is NotificationType {
  return value === "follow_request" || value === "new_follower" || value === "follow_accepted";
}
