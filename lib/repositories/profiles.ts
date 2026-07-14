import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { type ProfileRow, profiles } from "@/lib/db/schema";
import type { ValidatedProfileUpdate } from "@/lib/profile-update";
import type { AppTheme, AppUser } from "@/lib/users";
import { getDefaultUserSettings, normalizeUsername } from "@/lib/users";

export function toAppUser(row: ProfileRow): AppUser {
  return {
    id: row.id,
    clerkUserId: row.clerkUserId,
    username: row.username,
    slug: `@${row.username}`,
    plan: row.plan,
    displayName: row.displayName,
    birthYear: row.birthYear,
    avatarSeed: row.avatarSeed,
    avatarUrl: row.avatarUrl ?? undefined,
    avatarPublicId: row.avatarPublicId,
    bio: row.bio,
    location: row.location ?? undefined,
    pronouns: row.pronouns ?? undefined,
    preferredLanguage: row.preferredLanguage,
    socialLinks: row.socialLinks ?? undefined,
    website: row.website ?? undefined,
    settings: row.settings,
    reminderEnabled: row.reminderEnabled,
    isPrivate: row.isPrivate,
  };
}

export async function getProfileById(id: string) {
  const [row] = await getDatabase().select().from(profiles).where(eq(profiles.id, id)).limit(1);
  return row ? toAppUser(row) : undefined;
}

export async function getProfileByClerkId(clerkUserId: string) {
  const [row] = await getDatabase()
    .select()
    .from(profiles)
    .where(eq(profiles.clerkUserId, clerkUserId))
    .limit(1);
  return row ? toAppUser(row) : undefined;
}

export async function getProfileByUsername(username: string) {
  const normalizedUsername = normalizeUsername(username);
  const [row] = await getDatabase()
    .select()
    .from(profiles)
    .where(eq(profiles.username, normalizedUsername))
    .limit(1);
  return row ? toAppUser(row) : undefined;
}

export async function getProfileByPath(pathSegment: string) {
  return getProfileByUsername(pathSegment);
}

export async function listPublicProfiles() {
  const rows = await getDatabase().select().from(profiles).orderBy(profiles.username);
  return rows.map(toAppUser);
}

export async function listReminderProfiles() {
  const rows = await getDatabase()
    .select()
    .from(profiles)
    .where(and(eq(profiles.reminderEnabled, true), isNotNull(profiles.clerkUserId)))
    .orderBy(profiles.username);
  return rows.map(toAppUser);
}

export async function linkClerkUserToProfile(appUserId: string, clerkUserId: string) {
  const [row] = await getDatabase()
    .update(profiles)
    .set({ clerkUserId, updatedAt: new Date() })
    .where(and(eq(profiles.id, appUserId), isNull(profiles.clerkUserId)))
    .returning();
  return row ? toAppUser(row) : getProfileByClerkId(clerkUserId);
}

export async function createProfile(input: {
  id: string;
  clerkUserId: string;
  username: string;
  displayName: string;
  birthYear: number;
  avatarSeed: string;
}) {
  const username = normalizeUsername(input.username);
  const [row] = await getDatabase()
    .insert(profiles)
    .values({
      ...input,
      username,
      plan: "standard",
      bio: { en: "", vi: "" },
      preferredLanguage: "en",
      settings: getDefaultUserSettings(),
      reminderEnabled: false,
    })
    .onConflictDoNothing({ target: profiles.clerkUserId })
    .returning();

  return row ? toAppUser(row) : getProfileByClerkId(input.clerkUserId);
}

export async function updateProfileTheme(profile: AppUser, theme: AppTheme) {
  const settings = { ...profile.settings, theme };
  await getDatabase()
    .update(profiles)
    .set({ settings, updatedAt: new Date() })
    .where(eq(profiles.id, profile.id));
  return settings;
}

export async function updateProfileAvatar(input: {
  profileId: string;
  avatarUrl: string;
  avatarPublicId: string;
}) {
  const [row] = await getDatabase()
    .update(profiles)
    .set({
      avatarUrl: input.avatarUrl,
      avatarPublicId: input.avatarPublicId,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, input.profileId))
    .returning();
  return row ? toAppUser(row) : undefined;
}

export async function updatePublicProfile(profileId: string, input: ValidatedProfileUpdate) {
  const [row] = await getDatabase()
    .update(profiles)
    .set({
      displayName: input.displayName,
      birthYear: input.birthYear,
      bio: input.bio,
      pronouns: input.pronouns ?? null,
      website: input.website ?? null,
      socialLinks: input.socialLinks ?? null,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, profileId))
    .returning();

  return row ? toAppUser(row) : undefined;
}
