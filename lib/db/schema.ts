import { sql } from "drizzle-orm";
import {
  boolean,
  check,
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
import type { UserLocation, UserPlan, UserSettings, UserSocialLinks } from "@/lib/users";

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
    isPrivate: boolean("is_private").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("profiles_username_normalized_idx").on(table.username)],
);

export const workouts = pgTable(
  "workouts",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    type: text("type").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    note: text("note"),
    isPublic: boolean("is_public").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("workouts_profile_date_idx").on(table.profileId, table.date),
    index("workouts_profile_created_idx").on(table.profileId, table.createdAt, table.id),
  ],
);

export const workoutImages = pgTable(
  "workout_images",
  {
    id: serial("id").primaryKey(),
    workoutId: text("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
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

export type FollowStatus = "pending" | "accepted";
export type NotificationType =
  | "follow_request"
  | "new_follower"
  | "follow_accepted"
  | "workout_liked"
  | "workout_commented";

export const profileFollows = pgTable(
  "profile_follows",
  {
    id: serial("id").primaryKey(),
    followerProfileId: text("follower_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    followingProfileId: text("following_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: text("status").$type<FollowStatus>().notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("profile_follows_pair_idx").on(table.followerProfileId, table.followingProfileId),
    index("profile_follows_follower_status_idx").on(table.followerProfileId, table.status),
    index("profile_follows_following_status_idx").on(table.followingProfileId, table.status),
    check(
      "profile_follows_not_self_check",
      sql`${table.followerProfileId} <> ${table.followingProfileId}`,
    ),
    check("profile_follows_status_check", sql`${table.status} in ('pending', 'accepted')`),
  ],
);

export const workoutLikes = pgTable(
  "workout_likes",
  {
    id: serial("id").primaryKey(),
    workoutId: text("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("workout_likes_workout_profile_idx").on(table.workoutId, table.profileId),
    index("workout_likes_workout_created_idx").on(table.workoutId, table.createdAt),
  ],
);

export const workoutComments = pgTable(
  "workout_comments",
  {
    id: text("id").primaryKey(),
    workoutId: text("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    authorProfileId: text("author_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("workout_comments_workout_created_idx").on(table.workoutId, table.createdAt, table.id),
    index("workout_comments_author_idx").on(table.authorProfileId),
    check(
      "workout_comments_body_length_check",
      sql`char_length(btrim(${table.body})) between 1 and 500`,
    ),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    recipientProfileId: text("recipient_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    actorProfileId: text("actor_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    workoutId: text("workout_id").references(() => workouts.id, { onDelete: "cascade" }),
    commentId: text("comment_id").references(() => workoutComments.id, { onDelete: "cascade" }),
    type: text("type").$type<NotificationType>().notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_recipient_created_idx").on(table.recipientProfileId, table.createdAt),
    index("notifications_recipient_read_idx").on(table.recipientProfileId, table.readAt),
    uniqueIndex("notifications_unique_workout_like_idx")
      .on(table.recipientProfileId, table.actorProfileId, table.workoutId)
      .where(sql`${table.type} = 'workout_liked'`),
    check(
      "notifications_type_check",
      sql`${table.type} in ('follow_request', 'new_follower', 'follow_accepted', 'workout_liked', 'workout_commented')`,
    ),
  ],
);

export type ProfileRow = typeof profiles.$inferSelect;
export type WorkoutRow = typeof workouts.$inferSelect;
export type WorkoutImageRow = typeof workoutImages.$inferSelect;
export type ProfileFollowRow = typeof profileFollows.$inferSelect;
export type WorkoutLikeRow = typeof workoutLikes.$inferSelect;
export type WorkoutCommentRow = typeof workoutComments.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
