import "server-only";

import { getProfileByClerkId, updateProfileRole } from "@hope/core";
import { getDatabase } from "@hope/db";
import { profiles, workouts } from "@hope/db/schema";
import type { UserRole } from "@hope/shared";
import { count, desc } from "drizzle-orm";

export type AdminOverview = {
  metrics: {
    profiles: number;
    workouts: number;
  };
  recentProfiles: Array<{
    id: string;
    username: string;
    displayName: string;
    role: UserRole;
    plan: string;
    createdAt: string;
  }>;
};

export async function isAdminClerkUserId(clerkUserId: string | null) {
  if (!clerkUserId) return false;
  const profile = await getProfileByClerkId(clerkUserId);
  return profile?.role === "admin";
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const database = getDatabase();
  const [[profileCount], [workoutCount], recentProfiles] = await Promise.all([
    database.select({ value: count() }).from(profiles),
    database.select({ value: count() }).from(workouts),
    database
      .select({
        id: profiles.id,
        username: profiles.username,
        displayName: profiles.displayName,
        role: profiles.role,
        plan: profiles.plan,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .orderBy(desc(profiles.createdAt))
      .limit(12),
  ]);

  return {
    metrics: {
      profiles: profileCount?.value ?? 0,
      workouts: workoutCount?.value ?? 0,
    },
    recentProfiles: recentProfiles.map((profile) => ({
      ...profile,
      createdAt: profile.createdAt.toISOString(),
    })),
  };
}

export async function setAdminManagedProfileRole(input: { profileId: string; role: UserRole }) {
  return updateProfileRole(input.profileId, input.role);
}
