import { getWorkoutAccess, getWorkoutMusicByWorkoutId } from "@hope/core";
import { Hono, type MiddlewareHandler } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import type { AppEnv } from "../env";
import { DeezerServiceError, getDeezerTrack, searchDeezerTracks } from "../lib/deezer";
import { jsonError, onboardingRequired, unauthorized } from "../lib/responses";
import { validated } from "../lib/validate";
import { resolveOwner } from "../middleware/auth";
import {
  authErrorResponses,
  bearerSecurity,
  jsonResponse,
  publicSecurity,
  workoutMusicSchema,
} from "../openapi";

const searchQuerySchema = z.object({
  q: z.string().trim().min(2, "Search must contain at least 2 characters.").max(100),
});

const workoutIdSchema = z.object({
  workoutId: z.string().min(1),
});

const deezerResultSchema = workoutMusicSchema.extend({
  previewUrl: z.string().optional(),
});

const noStore: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
};

export const musicRoutes = new Hono<AppEnv>()
  .get(
    "/music/deezer/search",
    describeRoute({
      tags: ["Music"],
      summary: "Search Deezer tracks",
      security: [...bearerSecurity],
      responses: {
        200: jsonResponse(z.object({ tracks: z.array(deezerResultSchema) }), "Deezer results"),
        ...authErrorResponses,
      },
    }),
    noStore,
    validated("query", searchQuerySchema),
    async (c) => {
      const owner = await resolveOwner(c);
      if (owner.status === "signed-out") return unauthorized(c);
      if (owner.status === "onboarding") {
        return onboardingRequired(c, "Complete onboarding before searching for music.");
      }
      try {
        // Note: Deezer search is geo-restricted by caller IP. Cloudflare Worker
        // egress often returns empty results; the web app searches via browser JSONP.
        const tracks = await searchDeezerTracks(c.req.valid("query").q);
        return c.json({ tracks });
      } catch (error) {
        console.warn(
          "Unable to search Deezer.",
          error instanceof Error ? error.message : "unknown error",
        );
        return jsonError(c, "Deezer search is temporarily unavailable.", 503);
      }
    },
  )
  .get(
    "/workouts/:workoutId/music-preview",
    describeRoute({
      tags: ["Music", "Workouts"],
      summary: "Refresh the Deezer preview URL for an accessible workout",
      security: [...publicSecurity],
      responses: {
        200: jsonResponse(
          z.object({ previewUrl: z.string().nullable() }),
          "Fresh Deezer preview URL",
        ),
        ...authErrorResponses,
      },
    }),
    noStore,
    validated("param", workoutIdSchema),
    async (c) => {
      const owner = await resolveOwner(c);
      const viewerProfileId = owner.status === "ready" ? owner.profile.id : undefined;
      const workoutId = c.req.valid("param").workoutId;
      const access = await getWorkoutAccess(workoutId, viewerProfileId);
      if (access.status === "not-found") return jsonError(c, "Workout was not found.", 404);
      if (access.status === "forbidden") {
        return jsonError(c, "You cannot view this workout.", 403);
      }
      const music = await getWorkoutMusicByWorkoutId(workoutId);
      if (!music) return jsonError(c, "This workout has no music.", 404);
      try {
        const track = await getDeezerTrack(music.trackId);
        return c.json({ previewUrl: track.previewUrl ?? null });
      } catch (error) {
        const notFound = error instanceof DeezerServiceError && error.kind === "not-found";
        return jsonError(
          c,
          notFound
            ? "This Deezer preview is no longer available."
            : "Deezer preview is temporarily unavailable.",
          notFound ? 404 : 503,
        );
      }
    },
  );
