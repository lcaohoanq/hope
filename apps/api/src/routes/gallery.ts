import { createClerkClient } from "@clerk/backend";
import {
  getProfileByClerkId,
  getProfileByUsername,
  listPublicGalleryItemsByProfile,
} from "@hope/core";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import type { AppEnv } from "../env";
import { jsonError } from "../lib/responses";
import { validated } from "../lib/validate";
import { jsonResponse, publicSecurity } from "../openapi";

const DEFAULT_FEATURED_EMAIL = "hoangclw@gmail.com";
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;

const galleryQuerySchema = z.object({
  username: z.string().min(1).optional(),
  email: z.string().email().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
});

const galleryItemSchema = z.object({
  image: z.string().url(),
  text: z.string(),
  workoutId: z.string(),
  date: z.string(),
});

const galleryResponseSchema = z.object({
  success: z.literal(true),
  profile: z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string(),
  }),
  items: z.array(galleryItemSchema),
});

async function resolveGalleryProfile(
  env: AppEnv["Bindings"],
  query: z.infer<typeof galleryQuerySchema>,
) {
  const username = query.username?.trim() || env.FEATURED_GALLERY_USERNAME?.trim() || undefined;
  if (username) {
    return getProfileByUsername(username);
  }

  const email =
    query.email?.trim().toLowerCase() ||
    env.FEATURED_GALLERY_EMAIL?.trim().toLowerCase() ||
    DEFAULT_FEATURED_EMAIL;

  const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
  const result = await clerk.users.getUserList({
    emailAddress: [email],
    limit: 1,
  });
  const clerkUser = result.data[0];
  if (!clerkUser) return undefined;
  return getProfileByClerkId(clerkUser.id);
}

export const galleryRoutes = new Hono<AppEnv>().get(
  "/public/gallery",
  describeRoute({
    tags: ["Gallery"],
    summary: "Public workout image gallery for the homepage",
    security: [...publicSecurity],
    responses: {
      200: jsonResponse(galleryResponseSchema, "Gallery items"),
      403: jsonResponse(
        z.object({ success: z.literal(false), error: z.string() }),
        "Private profile",
      ),
      404: jsonResponse(
        z.object({ success: z.literal(false), error: z.string() }),
        "Profile not found",
      ),
    },
  }),
  validated("query", galleryQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const profile = await resolveGalleryProfile(c.env, query);
    if (!profile) return jsonError(c, "Profile was not found.", 404);
    if (profile.isPrivate) return jsonError(c, "This gallery is private.", 403);

    const items = await listPublicGalleryItemsByProfile(profile.id, query.limit ?? DEFAULT_LIMIT);

    return c.json({
      success: true as const,
      profile: {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
      },
      items,
    });
  },
);
