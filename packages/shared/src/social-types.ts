import type { PublicAppUser } from "./users";
import type { Workout } from "./workout-types";

export type FollowStatus = "pending" | "accepted";
export type NotificationType =
  | "follow_request"
  | "new_follower"
  | "follow_accepted"
  | "workout_liked"
  | "workout_commented";

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
  workoutId?: string;
  commentId?: string;
  isRead: boolean;
  createdAt: string;
};

export type WorkoutComment = {
  id: string;
  workoutId: string;
  author: PublicAppUser;
  body: string;
  createdAt: string;
  updatedAt: string;
  viewerCanEdit: boolean;
  viewerCanDelete: boolean;
};

export type FeedItem = {
  workout: Workout;
  profile: PublicAppUser;
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
  viewerCanInteract: boolean;
  commentsPreview: WorkoutComment[];
};
