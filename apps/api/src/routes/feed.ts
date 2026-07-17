import { listFeedWorkouts } from "@hope/core";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import type { AppEnv } from "../env";
import { onboardingRequired, unauthorized } from "../lib/responses";
import { validated } from "../lib/validate";
import { resolveOwner } from "../middleware/auth";
import {
  authErrorResponses,
  bearerSecurity,
  cursorQuerySchema,
  feedItemSchema,
  jsonResponse,
} from "../openapi";

const feedResponseSchema = z.object({
  success: z.literal(true),
  items: z.array(feedItemSchema),
  nextCursor: z.string().nullable().optional(),
});

export const feedRoutes = new Hono<AppEnv>().get(
  "/feed",
  describeRoute({
    tags: ["Feed"],
    summary: "List the authenticated user's social feed",
    security: [...bearerSecurity],
    responses: {
      200: jsonResponse(feedResponseSchema, "Feed page"),
      ...authErrorResponses,
    },
  }),
  validated("query", cursorQuerySchema),
  async (c) => {
    const owner = await resolveOwner(c);
    if (owner.status === "signed-out") return unauthorized(c);
    if (owner.status === "onboarding") return onboardingRequired(c);

    const { cursor } = c.req.valid("query");
    const result = await listFeedWorkouts(owner.profile.id, cursor);
    return c.json({ success: true as const, ...result });
  },
);
