import {
  followProfile,
  getProfileById,
  getProfileByUsername,
  getWorkoutCountByProfile,
  listConnections,
  removeFollower,
  resolveProfileAccess,
  unfollowOrCancel,
} from "@hope/core";
import { toPrivateProfileShell, toPublicUser } from "@hope/shared";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import type { AppEnv } from "../env";
import { jsonError, onboardingRequired, unauthorized } from "../lib/responses";
import { validated } from "../lib/validate";
import { resolveOwner } from "../middleware/auth";
import {
  authErrorResponses,
  bearerSecurity,
  connectionsQuerySchema,
  jsonResponse,
  publicSecurity,
  publicUserSchema,
  socialSummarySchema,
  successTrueSchema,
} from "../openapi";

const profileByUsernameResponseSchema = z.object({
  success: z.literal(true),
  profile: publicUserSchema,
  social: socialSummarySchema,
  viewerStatus: z.enum(["signed-out", "onboarding", "ready"]),
  viewer: publicUserSchema.nullable(),
  workoutCount: z.number(),
});

const connectionsResponseSchema = z.object({
  success: z.literal(true),
  items: z.array(
    z.object({
      profile: publicUserSchema,
      relationshipStatus: z.enum(["self", "none", "pending", "following"]),
    }),
  ),
  nextCursor: z.string().nullable().optional(),
});

const followResponseSchema = z.object({
  success: z.literal(true),
  relationshipStatus: z.enum(["following", "pending", "none"]),
});

export const profileRoutes = new Hono<AppEnv>()
  .get(
    "/profiles/by-username/:username",
    describeRoute({
      tags: ["Profiles"],
      summary: "Get a profile by username",
      security: [...publicSecurity],
      responses: {
        200: jsonResponse(profileByUsernameResponseSchema, "Profile + social summary"),
        ...authErrorResponses,
      },
    }),
    async (c) => {
      const profile = await getProfileByUsername(c.req.param("username")!);
      if (!profile) return jsonError(c, "Profile was not found.", 404);

      const owner = await resolveOwner(c);
      const viewer = owner.status === "ready" ? owner.profile : undefined;
      const [social, visibleWorkoutCount] = await Promise.all([
        resolveProfileAccess(profile, viewer),
        getWorkoutCountByProfile(profile.id, viewer?.id === profile.id ? "all" : "public"),
      ]);
      const publicViewer = viewer ? toPublicUser(viewer) : null;
      const socialProfile = social.canViewWorkouts
        ? toPublicUser(profile)
        : toPrivateProfileShell(profile);

      return c.json({
        success: true as const,
        profile: socialProfile,
        social,
        viewerStatus: owner.status,
        viewer: publicViewer,
        workoutCount: social.canViewWorkouts ? visibleWorkoutCount : 0,
      });
    },
  )
  .get(
    "/profiles/:profileId/connections",
    describeRoute({
      tags: ["Profiles"],
      summary: "List followers or following for a profile",
      security: [...publicSecurity],
      responses: {
        200: jsonResponse(connectionsResponseSchema, "Connection page"),
        ...authErrorResponses,
      },
    }),
    validated("query", connectionsQuerySchema),
    async (c) => {
      const profileId = c.req.param("profileId")!;
      const target = await getProfileById(profileId);
      if (!target) return jsonError(c, "Profile was not found.", 404);

      const owner = await resolveOwner(c);
      const viewer = owner.status === "ready" ? owner.profile : undefined;
      const access = await resolveProfileAccess(target, viewer);
      if (!access.canViewConnections) return jsonError(c, "This connection list is private.", 403);

      const { type, cursor } = c.req.valid("query");
      const result = await listConnections(profileId, type, viewer?.id, cursor);
      return c.json({ success: true as const, ...result });
    },
  )
  .post(
    "/profiles/:profileId/follow",
    describeRoute({
      tags: ["Profiles"],
      summary: "Follow a profile (or request to follow if private)",
      security: [...bearerSecurity],
      responses: {
        200: jsonResponse(followResponseSchema, "Follow status"),
        ...authErrorResponses,
      },
    }),
    async (c) => {
      const owner = await resolveOwner(c);
      if (owner.status === "signed-out") return unauthorized(c);
      if (owner.status === "onboarding") return onboardingRequired(c);

      const profileId = c.req.param("profileId")!;
      if (profileId === owner.profile.id) return jsonError(c, "You cannot follow yourself.", 400);

      const target = await getProfileById(profileId);
      if (!target) return jsonError(c, "Profile was not found.", 404);

      const status = await followProfile(owner.profile, target);
      return c.json({
        success: true as const,
        relationshipStatus: status === "accepted" ? ("following" as const) : ("pending" as const),
      });
    },
  )
  .delete(
    "/profiles/:profileId/follow",
    describeRoute({
      tags: ["Profiles"],
      summary: "Unfollow or cancel a follow request",
      security: [...bearerSecurity],
      responses: {
        200: jsonResponse(followResponseSchema, "Follow cleared"),
        ...authErrorResponses,
      },
    }),
    async (c) => {
      const owner = await resolveOwner(c);
      if (owner.status === "signed-out") return unauthorized(c);
      if (owner.status === "onboarding") return onboardingRequired(c);

      const removed = await unfollowOrCancel(owner.profile.id, c.req.param("profileId")!);
      return removed
        ? c.json({ success: true as const, relationshipStatus: "none" as const })
        : jsonError(c, "Follow relationship was not found.", 404);
    },
  )
  .delete(
    "/profiles/:profileId/followers/:followerId",
    describeRoute({
      tags: ["Profiles"],
      summary: "Remove a follower from your profile",
      security: [...bearerSecurity],
      responses: {
        200: jsonResponse(successTrueSchema, "Follower removed"),
        ...authErrorResponses,
      },
    }),
    async (c) => {
      const owner = await resolveOwner(c);
      if (owner.status === "signed-out") return unauthorized(c);
      if (owner.status === "onboarding") return onboardingRequired(c);

      const profileId = c.req.param("profileId")!;
      if (profileId !== owner.profile.id) return jsonError(c, "Follower was not found.", 404);

      const removed = await removeFollower(profileId, c.req.param("followerId")!);
      return removed
        ? c.json({ success: true as const })
        : jsonError(c, "Follower was not found.", 404);
    },
  );
