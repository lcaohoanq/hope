import {
  followProfile,
  getProfileById,
  getProfileByUsername,
  listConnections,
  removeFollower,
  resolveProfileAccess,
  unfollowOrCancel,
} from "@hope/core";
import { toPrivateProfileShell, toPublicUser } from "@hope/shared";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../env";
import { jsonError, onboardingRequired, unauthorized } from "../lib/responses";
import { validated } from "../lib/validate";
import { resolveOwner } from "../middleware/auth";

export const profileRoutes = new Hono<AppEnv>()
  .get("/profiles/by-username/:username", async (c) => {
    const profile = await getProfileByUsername(c.req.param("username"));
    if (!profile) return jsonError(c, "Profile was not found.", 404);

    const owner = await resolveOwner(c);
    const viewer = owner.status === "ready" ? owner.profile : undefined;
    const social = await resolveProfileAccess(profile, viewer);
    return c.json({
      success: true as const,
      profile: social.canViewWorkouts ? toPublicUser(profile) : toPrivateProfileShell(profile),
      social,
    });
  })
  .get(
    "/profiles/:profileId/connections",
    validated(
      "query",
      z.object({
        type: z.enum(["followers", "following"]),
        cursor: z.string().optional(),
      }),
    ),
    async (c) => {
      const profileId = c.req.param("profileId");
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
  .post("/profiles/:profileId/follow", async (c) => {
    const owner = await resolveOwner(c);
    if (owner.status === "signed-out") return unauthorized(c);
    if (owner.status === "onboarding") return onboardingRequired(c);

    const profileId = c.req.param("profileId");
    if (profileId === owner.profile.id) return jsonError(c, "You cannot follow yourself.", 400);

    const target = await getProfileById(profileId);
    if (!target) return jsonError(c, "Profile was not found.", 404);

    const status = await followProfile(owner.profile, target);
    return c.json({
      success: true as const,
      relationshipStatus: status === "accepted" ? ("following" as const) : ("pending" as const),
    });
  })
  .delete("/profiles/:profileId/follow", async (c) => {
    const owner = await resolveOwner(c);
    if (owner.status === "signed-out") return unauthorized(c);
    if (owner.status === "onboarding") return onboardingRequired(c);

    const removed = await unfollowOrCancel(owner.profile.id, c.req.param("profileId"));
    return removed
      ? c.json({ success: true as const, relationshipStatus: "none" as const })
      : jsonError(c, "Follow relationship was not found.", 404);
  })
  .delete("/profiles/:profileId/followers/:followerId", async (c) => {
    const owner = await resolveOwner(c);
    if (owner.status === "signed-out") return unauthorized(c);
    if (owner.status === "onboarding") return onboardingRequired(c);

    const profileId = c.req.param("profileId");
    if (profileId !== owner.profile.id) return jsonError(c, "Follower was not found.", 404);

    const removed = await removeFollower(profileId, c.req.param("followerId"));
    return removed
      ? c.json({ success: true as const })
      : jsonError(c, "Follower was not found.", 404);
  });
