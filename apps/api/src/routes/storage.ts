import { getStorageAdapter } from "@hope/core";
import { Hono } from "hono";
import { stream } from "hono/streaming";
import type { AppEnv } from "../env";

export const storageRoutes = new Hono<AppEnv>().get("/storage/*", async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/storage\//, "")).replace(/^\/+/, "");
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
});
