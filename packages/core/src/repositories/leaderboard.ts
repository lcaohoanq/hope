import { getDatabase } from "@hope/db";
import { profileFollows, profiles, workouts } from "@hope/db/schema";
import type { LeaderboardEntry, LeaderboardPeriod } from "@hope/shared";
import { getLeaderboardDateRange } from "@hope/shared";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

/**
 * Profile ids in the viewer's mutual-follow set (accepted both ways), plus the viewer.
 */
export async function listMutualFriendProfileIds(viewerProfileId: string) {
  const db = getDatabase();
  const outgoing = alias(profileFollows, "outgoing_follows");
  const incoming = alias(profileFollows, "incoming_follows");

  const rows = await db
    .select({ id: outgoing.followingProfileId })
    .from(outgoing)
    .innerJoin(
      incoming,
      and(
        eq(outgoing.followingProfileId, incoming.followerProfileId),
        eq(outgoing.followerProfileId, incoming.followingProfileId),
        eq(incoming.status, "accepted"),
      ),
    )
    .where(and(eq(outgoing.followerProfileId, viewerProfileId), eq(outgoing.status, "accepted")));

  return [viewerProfileId, ...rows.map((row) => row.id)];
}

/**
 * Mutual-friends leaderboard for a period. Private workouts count toward points.
 */
export async function getLeaderboard(viewerProfileId: string, period: LeaderboardPeriod) {
  const profileIds = await listMutualFriendProfileIds(viewerProfileId);
  const { start, end } = getLeaderboardDateRange(period);
  const db = getDatabase();

  const conditions = [inArray(workouts.profileId, profileIds), lte(workouts.date, end)];
  if (start) {
    conditions.push(gte(workouts.date, start));
  }

  const scoreRows = await db
    .select({
      profileId: workouts.profileId,
      totalPoints: sql<number>`coalesce(sum(${workouts.points}), 0)::int`.as("total_points"),
    })
    .from(workouts)
    .where(and(...conditions))
    .groupBy(workouts.profileId);

  const pointsByProfile = new Map(scoreRows.map((row) => [row.profileId, Number(row.totalPoints)]));

  const profileRows = await db
    .select({
      id: profiles.id,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(inArray(profiles.id, profileIds));

  const entries: LeaderboardEntry[] = profileRows
    .map((profile) => ({
      rank: 0,
      profileId: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
      totalPoints: pointsByProfile.get(profile.id) ?? 0,
      isViewer: profile.id === viewerProfileId,
    }))
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return a.username.localeCompare(b.username);
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return {
    period,
    range: { start, end },
    entries,
  };
}
