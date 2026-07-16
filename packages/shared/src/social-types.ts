import type { PublicAppUser } from "./users";
import type { Workout } from "./workout-types";

/** Follow edge status in the database. */
export type FollowStatus = "pending" | "accepted";
/** Notification event kinds emitted by social actions. */
export type NotificationType =
  | "follow_request"
  | "new_follower"
  | "follow_accepted"
  | "workout_liked"
  | "workout_commented";

/** Viewer's relationship to a profile. */
export type RelationshipStatus = "self" | "none" | "pending" | "following";

/** Counts and access flags for a profile's social graph. */
export type SocialSummary = {
  followersCount: number;
  followingCount: number;
  relationshipStatus: RelationshipStatus;
  canViewConnections: boolean;
  canViewWorkouts: boolean;
};

/** One entry in a followers/following list. */
export type ConnectionItem = {
  profile: PublicAppUser;
  relationshipStatus: RelationshipStatus;
};

/** In-app notification shown in the bell / notifications page. */
export type AppNotification = {
  id: string;
  type: NotificationType;
  actor?: PublicAppUser;
  workoutId?: string;
  commentId?: string;
  isRead: boolean;
  createdAt: string;
};

/** Workout comment with viewer permission flags. */
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

/** One card in the social feed. */
export type FeedItem = {
  workout: Workout;
  profile: PublicAppUser;
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
  viewerCanInteract: boolean;
  commentsPreview: WorkoutComment[];
};
