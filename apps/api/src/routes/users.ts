import { createClerkClient } from "@clerk/backend";
import {
  createProfile,
  getStorageAdapter,
  linkClerkUserToProfile,
  searchProfiles,
  updateProfileAvatar,
  updateProfilePrivacy,
  updateProfileTheme,
  updatePublicProfile,
} from "@hope/core";
import {
  AVATAR_MIME_TYPES,
  getProfileUpdateFieldErrors,
  isAppTheme,
  MAX_AVATAR_BYTES,
  normalizeUsername,
  profileUpdateSchema,
  toPublicUser,
} from "@hope/shared";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import type { AppEnv } from "../env";
import {
  invalidJson,
  jsonError,
  onboardingRequired,
  readJson,
  unauthorized,
} from "../lib/responses";
import { validated } from "../lib/validate";
import { resolveOwner } from "../middleware/auth";
import {
  authErrorResponses,
  bearerSecurity,
  jsonResponse,
  privacyBodySchema,
  publicUserSchema,
  settingsBodySchema,
} from "../openapi";

const meResponseSchema = z.object({
  success: z.literal(true),
  status: z.enum(["signed-out", "onboarding", "ready"]),
  user: publicUserSchema.nullable(),
});

const userSuccessSchema = z.object({
  success: z.literal(true),
  user: publicUserSchema,
});

const profileSuccessSchema = z.object({
  success: z.literal(true),
  profile: publicUserSchema,
});

const settingsSuccessSchema = z.object({
  success: z.literal(true),
  settings: z.record(z.string(), z.unknown()),
});

const searchResponseSchema = z.object({
  success: z.literal(true),
  users: z.array(publicUserSchema),
});

const avatarResponseSchema = z.object({
  success: z.literal(true),
  avatarUrl: z.string(),
});

export const userRoutes = new Hono<AppEnv>()
  .get(
    "/users/me",
    describeRoute({
      tags: ["Users"],
      summary: "Resolve the current auth/profile status",
      security: [...bearerSecurity],
      responses: {
        200: jsonResponse(meResponseSchema, "Current user status"),
        ...authErrorResponses,
      },
    }),
    async (c) => {
      const owner = await resolveOwner(c);
      if (owner.status === "signed-out") {
        return c.json({ success: true as const, status: "signed-out" as const, user: null });
      }
      if (owner.status === "onboarding") {
        return c.json({ success: true as const, status: "onboarding" as const, user: null });
      }
      return c.json({
        success: true as const,
        status: "ready" as const,
        user: toPublicUser(owner.profile),
      });
    },
  )
  .post(
    "/users/profile",
    describeRoute({
      tags: ["Users"],
      summary: "Complete onboarding / create profile",
      security: [...bearerSecurity],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                displayName: { type: "string" },
                birthYear: { type: "number" },
                avatarSeed: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: jsonResponse(userSuccessSchema, "Created or existing profile"),
        ...authErrorResponses,
      },
    }),
    async (c) => {
      const owner = await resolveOwner(c);
      if (owner.status === "signed-out") return unauthorized(c);
      if (owner.status === "ready") {
        return c.json({ success: true as const, user: toPublicUser(owner.profile) });
      }

      const clerkUserId = owner.clerkUserId;
      const clerk = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY });
      const clerkUser = await clerk.users.getUser(clerkUserId);
      if (!clerkUser) return jsonError(c, "Clerk user was not found.", 401);

      const appUserId = clerkUser.publicMetadata.appUserId;
      if (typeof appUserId === "string" && appUserId.trim()) {
        const linked = await linkClerkUserToProfile(appUserId, clerkUserId);
        if (linked) return c.json({ success: true as const, user: toPublicUser(linked) });
      }

      const parsed = await readJson<{
        displayName?: unknown;
        birthYear?: unknown;
        avatarSeed?: unknown;
      }>(c);
      if (!parsed.ok) return invalidJson(c);

      const displayName =
        typeof parsed.body.displayName === "string" ? parsed.body.displayName.trim() : "";
      const avatarSeed =
        typeof parsed.body.avatarSeed === "string" ? parsed.body.avatarSeed.trim() : "";
      const birthYear = Number(parsed.body.birthYear);
      const currentYear = new Date().getFullYear();
      const username = clerkUser.username ? normalizeUsername(clerkUser.username) : "";
      if (!username) return jsonError(c, "Choose a Clerk username before continuing.", 400);
      if (
        displayName.length < 2 ||
        !avatarSeed ||
        !Number.isInteger(birthYear) ||
        birthYear < 1900 ||
        birthYear > currentYear
      ) {
        return jsonError(c, "Profile details are invalid.", 400);
      }

      try {
        const profile = await createProfile({
          id: crypto.randomUUID(),
          clerkUserId,
          username,
          displayName,
          birthYear,
          avatarSeed,
        });
        if (!profile) throw new Error("Profile creation did not return a profile.");
        return c.json({ success: true as const, user: toPublicUser(profile) });
      } catch (error) {
        console.error("Unable to create profile.", error);
        return jsonError(c, "That username is already in use.", 409);
      }
    },
  )
  .patch(
    "/users/profile",
    describeRoute({
      tags: ["Users"],
      summary: "Update public profile fields",
      security: [...bearerSecurity],
      responses: {
        200: jsonResponse(profileSuccessSchema, "Updated profile"),
        ...authErrorResponses,
      },
    }),
    async (c) => {
      const owner = await resolveOwner(c);
      if (owner.status === "signed-out") return unauthorized(c);
      if (owner.status === "onboarding") {
        return onboardingRequired(c, "Complete onboarding before updating your profile.");
      }

      const parsed = await readJson(c);
      if (!parsed.ok) return invalidJson(c);

      const result = profileUpdateSchema.safeParse(parsed.body);
      if (!result.success) {
        return jsonError(c, "Profile details are invalid.", 400, {
          fieldErrors: getProfileUpdateFieldErrors(result.error),
        });
      }

      try {
        const profile = await updatePublicProfile(owner.profile.id, result.data);
        if (!profile) return jsonError(c, "Profile was not found.", 404);
        return c.json({ success: true as const, profile: toPublicUser(profile) });
      } catch (error) {
        console.error("Unable to update profile.", error);
        return jsonError(c, "Unable to update profile.", 500);
      }
    },
  )
  .patch(
    "/users/privacy",
    describeRoute({
      tags: ["Users"],
      summary: "Update profile privacy",
      security: [...bearerSecurity],
      responses: {
        200: jsonResponse(profileSuccessSchema, "Updated privacy"),
        ...authErrorResponses,
      },
    }),
    validated("json", privacyBodySchema),
    async (c) => {
      const owner = await resolveOwner(c);
      if (owner.status === "signed-out") return unauthorized(c);
      if (owner.status === "onboarding") return onboardingRequired(c);

      const { isPrivate } = c.req.valid("json");
      const profile = await updateProfilePrivacy(owner.profile.id, isPrivate);
      return profile
        ? c.json({ success: true as const, profile: toPublicUser(profile) })
        : jsonError(c, "Profile was not found.", 404);
    },
  )
  .patch(
    "/users/settings",
    describeRoute({
      tags: ["Users"],
      summary: "Update user settings (theme)",
      security: [...bearerSecurity],
      responses: {
        200: jsonResponse(settingsSuccessSchema, "Updated settings"),
        ...authErrorResponses,
      },
    }),
    validated("json", settingsBodySchema),
    async (c) => {
      const owner = await resolveOwner(c);
      if (owner.status === "signed-out") return unauthorized(c);
      if (owner.status === "onboarding") {
        return onboardingRequired(c, "Complete onboarding before updating settings.");
      }

      const { theme } = c.req.valid("json");
      if (!isAppTheme(theme)) return jsonError(c, "Theme must be light or dark.", 400);

      try {
        const settings = await updateProfileTheme(owner.profile, theme);
        return c.json({ success: true as const, settings });
      } catch (error) {
        console.error("Unable to update user settings.", error);
        return jsonError(c, "Unable to update user settings.", 500);
      }
    },
  )
  .get(
    "/users/search",
    describeRoute({
      tags: ["Users"],
      summary: "Search public profiles",
      security: [...bearerSecurity],
      responses: {
        200: jsonResponse(searchResponseSchema, "Matching users"),
        ...authErrorResponses,
      },
    }),
    validated("query", z.object({ q: z.string().optional() })),
    async (c) => {
      const owner = await resolveOwner(c);
      if (owner.status === "signed-out") return unauthorized(c);
      if (owner.status === "onboarding") return onboardingRequired(c);

      const { q } = c.req.valid("query");
      const users = await searchProfiles(q ?? "");
      return c.json({ success: true as const, users: users.map(toPublicUser) });
    },
  )
  .post(
    "/users/avatar",
    describeRoute({
      tags: ["Users"],
      summary: "Upload a profile avatar (multipart)",
      security: [...bearerSecurity],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["avatar"],
              properties: {
                avatar: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
      responses: {
        200: jsonResponse(avatarResponseSchema, "Avatar URL"),
        ...authErrorResponses,
      },
    }),
    async (c) => {
      const owner = await resolveOwner(c);
      if (owner.status === "signed-out") return unauthorized(c);
      if (owner.status === "onboarding") {
        return onboardingRequired(c, "Complete onboarding before uploading an avatar.");
      }

      let formData: FormData;
      try {
        formData = await c.req.formData();
      } catch {
        return jsonError(c, "Request body must be multipart form data.", 400);
      }

      const avatar = formData.get("avatar");
      if (!(avatar instanceof File)) return jsonError(c, "An avatar image is required.", 400);
      if (!AVATAR_MIME_TYPES.has(avatar.type)) {
        return jsonError(c, "Please upload a JPG, PNG, or WebP image.", 400);
      }
      if (avatar.size > MAX_AVATAR_BYTES) {
        return jsonError(c, "Avatar image must be 5MB or smaller.", 400);
      }

      const adapter = getStorageAdapter();
      const key = `avatars/${owner.profile.id}/${crypto.randomUUID()}`;
      let avatarUrl: string;

      try {
        const data = new Uint8Array(await avatar.arrayBuffer());
        const stored = await adapter.uploadWithTransform({
          key,
          data,
          contentType: avatar.type,
          transform: { width: 512, height: 512, fit: "cover", format: "webp", quality: 86 },
        });
        avatarUrl = stored.url;
      } catch (error) {
        console.error("Unable to process or upload avatar.", error);
        return jsonError(c, "Unable to process avatar image.", 500);
      }

      try {
        const updated = await updateProfileAvatar({
          profileId: owner.profile.id,
          avatarUrl,
          avatarPublicId: key,
        });
        if (!updated) throw new Error("Profile was not found during avatar update.");
      } catch (error) {
        await adapter.delete(key).catch(() => {});
        console.error("Unable to save avatar.", error);
        return jsonError(c, "Unable to save avatar.", 500);
      }

      if (owner.profile.avatarPublicId && owner.profile.avatarPublicId !== key) {
        void adapter
          .delete(owner.profile.avatarPublicId)
          .catch((error) => console.error("Unable to delete replaced avatar.", error));
      }
      return c.json({ success: true as const, avatarUrl });
    },
  );
