import { listNotifications, markNotificationsRead } from "@hope/core";
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
  jsonResponse,
  notificationSchema,
  notificationsPatchBodySchema,
  successTrueSchema,
} from "../openapi";

const listNotificationsResponseSchema = z.object({
  success: z.literal(true),
  items: z.array(notificationSchema),
  unreadCount: z.number(),
  nextCursor: z.string().nullable().optional(),
});

export const notificationRoutes = new Hono<AppEnv>()
  .get(
    "/notifications",
    describeRoute({
      tags: ["Notifications"],
      summary: "List notifications for the current user",
      security: [...bearerSecurity],
      responses: {
        200: jsonResponse(listNotificationsResponseSchema, "Notification page"),
        ...authErrorResponses,
      },
    }),
    validated("query", cursorQuerySchema),
    async (c) => {
      const owner = await resolveOwner(c);
      if (owner.status === "signed-out") return unauthorized(c);
      if (owner.status === "onboarding") return onboardingRequired(c);

      const { cursor } = c.req.valid("query");
      return c.json({
        success: true as const,
        ...(await listNotifications(owner.profile.id, cursor)),
      });
    },
  )
  .patch(
    "/notifications",
    describeRoute({
      tags: ["Notifications"],
      summary: "Mark one or all notifications as read",
      security: [...bearerSecurity],
      responses: {
        200: jsonResponse(successTrueSchema, "Marked read"),
        ...authErrorResponses,
      },
    }),
    validated("json", notificationsPatchBodySchema),
    async (c) => {
      const owner = await resolveOwner(c);
      if (owner.status === "signed-out") return unauthorized(c);
      if (owner.status === "onboarding") return onboardingRequired(c);

      const { notificationId } = c.req.valid("json");
      await markNotificationsRead(owner.profile.id, notificationId);
      return c.json({ success: true as const });
    },
  );
