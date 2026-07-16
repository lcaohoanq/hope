import { getStorageAdapter } from "@hope/core";
import { Hono } from "hono";
import { stream } from "hono/streaming";
import { describeRoute } from "hono-openapi";
import type { AppEnv } from "../env";
import { errorResponseSchema, jsonResponse, publicSecurity } from "../openapi";

export const storageRoutes = new Hono<AppEnv>().get(
  // Use a regex param so hono-openapi emits a path (bare `/storage/*` is omitted).
  "/storage/:key{.+}",
  describeRoute({
    tags: ["Storage"],
    summary: "Proxy a stored object (binary)",
    security: [...publicSecurity],
    responses: {
      200: {
        description: "Object bytes (`Content-Type` from storage)",
        content: {
          "application/octet-stream": {
            schema: {
              type: "string",
              format: "binary",
            },
          },
        },
      },
      400: jsonResponse(errorResponseSchema, "Invalid storage key"),
      404: {
        description: "Object not found",
      },
    },
  }),
  async (c) => {
    const key = decodeURIComponent(c.req.param("key") ?? "").replace(/^\/+/, "");
    if (!key || key.includes("..")) {
      return c.json({ success: false as const, error: "Invalid storage key." }, 400);
    }

    const adapter = getStorageAdapter();
    const object = await adapter.getObject(key);
    if (!object) return c.notFound();

    c.header("Content-Type", object.contentType);
    c.header("Cache-Control", "public, max-age=31536000, immutable");
    if (object.size != null) c.header("Content-Length", String(object.size));

    return stream(c, async (s) => {
      await s.pipe(object.body);
    });
  },
);
