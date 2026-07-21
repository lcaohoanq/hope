import "server-only";

import { getProfileByClerkId, updateProfileRole } from "@hope/core";
import { closeDatabase, getDatabase } from "@hope/db";
import { profiles, workouts } from "@hope/db/schema";
import type { UserRole } from "@hope/shared";
import { count, desc } from "drizzle-orm";

const ADMIN_DATABASE_TIMEOUT_MS = 10_000;

export class AdminDatabaseTimeoutError extends Error {
  constructor() {
    super("The admin database request timed out.");
    this.name = "AdminDatabaseTimeoutError";
  }
}

async function withAdminDatabaseTimeout<T>(operation: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new AdminDatabaseTimeoutError()),
      ADMIN_DATABASE_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race([operation, timeout]);
  } catch (error) {
    if (error instanceof AdminDatabaseTimeoutError) {
      // Destroy a wedged cached pool so the next request establishes a fresh connection.
      await closeDatabase();
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

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
  const profile = await withAdminDatabaseTimeout(getProfileByClerkId(clerkUserId));
  return profile?.role === "admin";
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const database = getDatabase();
  const [[profileCount], [workoutCount], recentProfiles] = await withAdminDatabaseTimeout(
    Promise.all([
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
    ]),
  );

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
