import { MAX_WORKOUT_IMAGES } from "@hope/shared";
import { z } from "zod";

/** Standard error envelope returned by most API handlers. */
export const errorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string(),
  })
  .passthrough()
  .meta({ ref: "ErrorResponse" });

export const privateProfileErrorSchema = z
  .object({
    success: z.literal(false),
    error: z.string(),
    reason: z.literal("private-profile").optional(),
    relationshipStatus: z.enum(["self", "none", "pending", "following"]).optional(),
  })
  .passthrough();

/** Minimal success flag used by several mutation responses. */
export const successTrueSchema = z.object({
  success: z.literal(true),
});

export const healthResponseSchema = z.object({
  ok: z.literal(true),
});

export const localizedTextSchema = z.object({
  en: z.string(),
  vi: z.string(),
});

export const publicUserSchema = z
  .object({
    id: z.string(),
    username: z.string(),
    slug: z.string(),
    plan: z.enum(["standard", "pro"]),
    displayName: z.string(),
    birthYear: z.number(),
    avatarSeed: z.string(),
    avatarUrl: z.string().optional(),
    bio: localizedTextSchema,
    pronouns: localizedTextSchema.optional(),
    preferredLanguage: z.enum(["vi", "en"]),
    website: z.string().optional(),
    isPrivate: z.boolean(),
    settings: z.record(z.string(), z.unknown()),
  })
  .passthrough()
  .meta({ ref: "PublicAppUser" });

export const workoutImageSchema = z.object({
  src: z.string(),
  format: z.enum(["avif", "webp", "jpg"]),
  width: z.number(),
  height: z.number(),
  sizeBytes: z.number(),
});

export const workoutSchema = z
  .object({
    id: z.string(),
    userId: z.string().optional(),
    date: z.string(),
    type: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    durationMinutes: z.number(),
    note: z.string().optional(),
    images: z.array(workoutImageSchema).optional(),
    createdAt: z.string(),
    isPublic: z.boolean(),
  })
  .passthrough()
  .meta({ ref: "Workout" });

export const workoutCommentSchema = z
  .object({
    id: z.string(),
    workoutId: z.string(),
    author: publicUserSchema,
    body: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    viewerCanEdit: z.boolean(),
    viewerCanDelete: z.boolean(),
  })
  .passthrough()
  .meta({ ref: "WorkoutComment" });

export const socialSummarySchema = z.object({
  followersCount: z.number(),
  followingCount: z.number(),
  relationshipStatus: z.enum(["self", "none", "pending", "following"]),
  canViewConnections: z.boolean(),
  canViewWorkouts: z.boolean(),
});

export const feedItemSchema = z
  .object({
    workout: workoutSchema,
    profile: publicUserSchema,
    likeCount: z.number(),
    commentCount: z.number(),
    viewerHasLiked: z.boolean(),
    viewerCanInteract: z.boolean(),
    commentsPreview: z.array(workoutCommentSchema),
  })
  .passthrough()
  .meta({ ref: "FeedItem" });

export const notificationSchema = z
  .object({
    id: z.string(),
    type: z.enum([
      "follow_request",
      "new_follower",
      "follow_accepted",
      "workout_liked",
      "workout_commented",
    ]),
    actor: publicUserSchema.optional(),
    workoutId: z.string().optional(),
    commentId: z.string().optional(),
    isRead: z.boolean(),
    createdAt: z.string(),
  })
  .passthrough();

export const connectionItemSchema = z.object({
  profile: publicUserSchema,
  relationshipStatus: z.enum(["self", "none", "pending", "following"]),
});

export const storedFileSchema = z.object({
  key: z.string(),
  url: z.string(),
  contentType: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  sizeBytes: z.number(),
});

export const cursorQuerySchema = z.object({
  cursor: z.string().optional(),
});

export const commentBodySchema = z.object({
  body: z.string(),
});

export const createWorkoutBodySchema = z.object({
  date: z.string().optional(),
  type: z.string().optional(),
  note: z.string().optional(),
  isPublic: z.boolean().optional(),
  imagePublicIds: z.array(z.string().min(1)).max(MAX_WORKOUT_IMAGES).optional(),
});

export const updateWorkoutBodySchema = createWorkoutBodySchema.extend({
  id: z.string().optional(),
  imageSrcs: z.array(z.string()).optional(),
});

export const createProfileBodySchema = z.object({
  displayName: z.string().optional(),
  birthYear: z.number().optional(),
  avatarSeed: z.string().optional(),
});

export const privacyBodySchema = z.object({
  isPrivate: z.boolean(),
});

export const settingsBodySchema = z.object({
  theme: z.enum(["light", "dark"]),
});

export const notificationsPatchBodySchema = z.object({
  notificationId: z.string().optional(),
});

/** Alias for notificationsPatchBodySchema */
export const markNotificationsBodySchema = notificationsPatchBodySchema;

export const followRequestBodySchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export const connectionsQuerySchema = z.object({
  type: z.enum(["followers", "following"]),
  cursor: z.string().optional(),
});

export const workoutImagesCreateBodySchema = z.object({
  count: z.number().int().min(1).max(MAX_WORKOUT_IMAGES),
});

export const workoutImagesCountBodySchema = workoutImagesCreateBodySchema;

export const workoutImagesDeleteBodySchema = z.object({
  publicIds: z.array(z.string().min(1)).min(1).max(MAX_WORKOUT_IMAGES),
});

export const feedQuerySchema = cursorQuerySchema;
export const notificationsQuerySchema = cursorQuerySchema;

export const usersSearchQuerySchema = z.object({
  q: z.string().optional(),
});

export const workoutsListQuerySchema = z.object({
  userId: z.string().min(1),
});

export const workoutsActivityQuerySchema = z.object({
  userId: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.string().optional(),
  year: z.string().optional(),
});

export const workoutIdParamSchema = z.object({
  workoutId: z.string().min(1),
});

export const commentIdParamSchema = z.object({
  commentId: z.string().min(1),
});

export const profileIdParamSchema = z.object({
  profileId: z.string().min(1),
});

export const usernameParamSchema = z.object({
  username: z.string().min(1),
});

export const followerParamsSchema = z.object({
  profileId: z.string().min(1),
  followerId: z.string().min(1),
});

export const feedResponseSchema = z.object({
  success: z.literal(true),
  items: z.array(feedItemSchema),
  nextCursor: z.string().nullable(),
});

export const notificationsResponseSchema = z.object({
  success: z.literal(true),
  items: z.array(notificationSchema),
  unreadCount: z.number(),
  nextCursor: z.string().nullable(),
});

export const workoutsListResponseSchema = z.object({
  workouts: z.array(workoutSchema),
  settings: z.object({ timezone: z.string() }),
});

export const workoutsActivityResponseSchema = z.object({
  workouts: z.array(workoutSchema),
  nextCursor: z.string().nullable(),
});

export const workoutMutationResponseSchema = z.object({
  success: z.literal(true),
  workout: workoutSchema,
});

export const workoutPostResponseSchema = z.object({
  success: z.literal(true),
  status: z.literal("ready"),
  item: feedItemSchema,
});

export const workoutCommentsResponseSchema = z.object({
  success: z.literal(true),
  status: z.literal("ready"),
  items: z.array(workoutCommentSchema),
  nextCursor: z.string().nullable(),
});

export const commentCreatedResponseSchema = z.object({
  success: z.literal(true),
  comment: workoutCommentSchema,
});

export const likeResponseSchema = z.object({
  success: z.literal(true),
  status: z.literal("ready"),
  likeCount: z.number(),
  viewerHasLiked: z.boolean(),
});

export const usersMeResponseSchema = z.object({
  success: z.literal(true),
  status: z.enum(["signed-out", "onboarding", "ready"]),
  user: publicUserSchema.nullable(),
});

export const userResponseSchema = z.object({
  success: z.literal(true),
  user: publicUserSchema,
});

export const profileResponseSchema = z.object({
  success: z.literal(true),
  profile: publicUserSchema,
});

export const settingsResponseSchema = z.object({
  success: z.literal(true),
  settings: z.record(z.string(), z.unknown()),
});

export const usersSearchResponseSchema = z.object({
  success: z.literal(true),
  users: z.array(publicUserSchema),
});

export const avatarResponseSchema = z.object({
  success: z.literal(true),
  avatarUrl: z.string(),
});

export const profileByUsernameResponseSchema = z.object({
  success: z.literal(true),
  profile: publicUserSchema,
  social: socialSummarySchema,
});

export const connectionsResponseSchema = z.object({
  success: z.literal(true),
  items: z.array(connectionItemSchema),
  nextCursor: z.string().nullable(),
});

export const followResponseSchema = z.object({
  success: z.literal(true),
  relationshipStatus: z.enum(["following", "pending", "none"]),
});

export const deleteCommentResponseSchema = z.object({
  success: z.literal(true),
  workoutId: z.string(),
});

export const workoutImagesTicketsResponseSchema = z.object({
  success: z.literal(true),
  apiKey: z.string(),
  uploadUrl: z.string(),
  uploads: z.array(
    z.object({
      params: z.record(z.string(), z.unknown()),
      publicId: z.string(),
      signature: z.string(),
    }),
  ),
});

export const workoutImagesCleanupResponseSchema = z.object({
  success: z.literal(true),
  deleted: z.array(z.string()),
  skipped: z.array(z.string()),
});

export const workoutImagesUploadResponseSchema = z.object({
  success: z.literal(true),
  assets: z.array(storedFileSchema),
});
