import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { Language, LocalizedText } from "@/lib/i18n";
import type {
  UserLocation,
  UserPlan,
  UserSettings,
  UserSocialLinks,
} from "@/lib/users";

export const profiles = pgTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    clerkUserId: text("clerk_user_id").unique(),
    username: text("username").notNull().unique(),
    plan: text("plan").$type<UserPlan>().notNull().default("standard"),
    displayName: text("display_name").notNull(),
    birthYear: integer("birth_year").notNull(),
    avatarSeed: text("avatar_seed").notNull(),
    avatarUrl: text("avatar_url"),
    avatarPublicId: text("avatar_public_id").unique(),
    bio: jsonb("bio").$type<LocalizedText>().notNull(),
    location: jsonb("location").$type<UserLocation>(),
    pronouns: jsonb("pronouns").$type<LocalizedText>(),
    preferredLanguage: text("preferred_language").$type<Language>().notNull().default("en"),
    socialLinks: jsonb("social_links").$type<UserSocialLinks>(),
    website: text("website"),
    settings: jsonb("settings").$type<UserSettings>().notNull(),
    reminderEnabled: boolean("reminder_enabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("profiles_username_normalized_idx").on(table.username)],
);

export const workouts = pgTable(
  "workouts",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    type: text("type").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("workouts_profile_date_idx").on(table.profileId, table.date)],
);

export const workoutImages = pgTable(
  "workout_images",
  {
    id: serial("id").primaryKey(),
    workoutId: text("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    publicId: text("public_id").notNull().unique(),
    secureUrl: text("secure_url").notNull(),
    format: text("format").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
  },
  (table) => [uniqueIndex("workout_images_position_idx").on(table.workoutId, table.position)],
);

export type ProfileRow = typeof profiles.$inferSelect;
export type WorkoutRow = typeof workouts.$inferSelect;
export type WorkoutImageRow = typeof workoutImages.$inferSelect;
