import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { AppEnv, Bindings } from "./env";
import app from "./index";

const nodeApp = new Hono<AppEnv>();

nodeApp.use("*", async (c, next) => {
  c.env = {
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY!,
    CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
    CLERK_WEBHOOK_SIGNING_SECRET: process.env.CLERK_WEBHOOK_SIGNING_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
    MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,
    MINIO_BUCKET: process.env.MINIO_BUCKET,
    STORAGE_PUBLIC_URL: process.env.STORAGE_PUBLIC_URL,
    FEATURED_GALLERY_USERNAME: process.env.FEATURED_GALLERY_USERNAME,
    FEATURED_GALLERY_EMAIL: process.env.FEATURED_GALLERY_EMAIL,
  } satisfies Bindings;
  await next();
});

nodeApp.route("/", app);

const port = Number(process.env.PORT) || 8787;
console.log(`Hope API listening on http://0.0.0.0:${port}`);
serve({ fetch: nodeApp.fetch, port, hostname: "0.0.0.0" });
