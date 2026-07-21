import { getLeaderboard } from "@hope/core";
import { LEADERBOARD_PERIODS, parseLeaderboardPeriod } from "@hope/shared";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import type { AppEnv } from "../env";
import { jsonError, onboardingRequired, unauthorized } from "../lib/responses";
import { validated } from "../lib/validate";
import { resolveOwner } from "../middleware/auth";
import { authErrorResponses, bearerSecurity, jsonResponse } from "../openapi";

const leaderboardEntrySchema = z
  .object({
    rank: z.number().int(),
    profileId: z.string(),
    username: z.string(),
    displayName: z.string(),
    avatarUrl: z.string().optional(),
    totalPoints: z.number().int(),
    isViewer: z.boolean(),
  })
  .passthrough()
  .meta({ ref: "LeaderboardEntry" });

const leaderboardResponseSchema = z.object({
  success: z.literal(true),
  period: z.enum(LEADERBOARD_PERIODS),
  range: z.object({
    start: z.string().nullable(),
    end: z.string(),
  }),
  entries: z.array(leaderboardEntrySchema),
});

const leaderboardQuerySchema = z.object({
  period: z.enum(LEADERBOARD_PERIODS).optional(),
});

export const leaderboardRoutes = new Hono<AppEnv>().get(
  "/leaderboard",
  describeRoute({
    tags: ["Leaderboard"],
    summary: "Mutual-friends leaderboard for weekly, monthly, or all-time points",
    security: [...bearerSecurity],
    responses: {
      200: jsonResponse(leaderboardResponseSchema, "Leaderboard"),
      ...authErrorResponses,
    },
  }),
  validated("query", leaderboardQuerySchema),
  async (c) => {
    const owner = await resolveOwner(c);
    if (owner.status === "signed-out") return unauthorized(c);
    if (owner.status === "onboarding") return onboardingRequired(c);

    const rawPeriod = c.req.valid("query").period ?? "weekly";
    const period = parseLeaderboardPeriod(rawPeriod);
    if (!period) return jsonError(c, "Invalid leaderboard period.", 400);

    const result = await getLeaderboard(owner.profile.id, period);
    return c.json({ success: true as const, ...result });
  },
);
