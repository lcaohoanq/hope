import type { NotificationType } from "@/lib/db/schema";
import type { PublicAppUser } from "@/lib/users";
import type { Workout } from "@/lib/workout-types";

export type RelationshipStatus = "self" | "none" | "pending" | "following";

export type SocialSummary = {
  followersCount: number;
  followingCount: number;
  relationshipStatus: RelationshipStatus;
  canViewConnections: boolean;
  canViewWorkouts: boolean;
};

export type ConnectionItem = {
  profile: PublicAppUser;
  relationshipStatus: RelationshipStatus;
};

export type AppNotification = {
  id: string;
  type: NotificationType;
  actor?: PublicAppUser;
  isRead: boolean;
  createdAt: string;
};

export type FeedItem = {
  workout: Workout;
  profile: PublicAppUser;
};
