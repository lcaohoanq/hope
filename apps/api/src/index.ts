import { configureStorageEnv } from "@hope/core";
import { setDefaultConnectionString } from "@hope/db";
import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { describeRoute, openAPIRouteHandler } from "hono-openapi";
import type { AppEnv } from "./env";
import {
  healthResponseSchema,
  jsonResponse,
  openApiDocumentation,
  publicSecurity,
} from "./openapi";
import { commentRoutes } from "./routes/comments";
import { feedRoutes } from "./routes/feed";
import { followRequestRoutes } from "./routes/follow-requests";
import { notificationRoutes } from "./routes/notifications";
import { profileRoutes } from "./routes/profiles";
import { storageRoutes } from "./routes/storage";
import { userRoutes } from "./routes/users";
import { workoutImageRoutes } from "./routes/workout-images";
import { workoutRoutes } from "./routes/workouts";

const app = new Hono<AppEnv>();

app.use("*", async (c, next) => {
  const url = c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL;
  if (url) setDefaultConnectionString(url);
  configureStorageEnv(c.env);
  await next();
});

app.use("*", (c, next) =>
  cors({
    origin: (origin, ctx) => {
      const allowed =
        ctx.env.ALLOWED_ORIGINS?.split(",")
          .map((value: string) => value.trim())
          .filter(Boolean) ?? [];
      if (allowed.length === 0) return origin;
      return allowed.includes(origin) ? origin : null;
    },
    credentials: true,
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })(c, next),
);

app.onError((error, c) => {
  console.error("Unhandled API error", error);
  return c.json({ success: false as const, error: "Something went wrong." }, 500);
});

const routes = app
  .get(
    "/health",
    describeRoute({
      tags: ["Health"],
      summary: "Liveness check",
      security: [...publicSecurity],
      responses: {
        200: jsonResponse(healthResponseSchema, "OK"),
      },
    }),
    (c) => c.json({ ok: true as const }),
  )
  .route("/", feedRoutes)
  .route("/", notificationRoutes)
  .route("/", workoutRoutes)
  .route("/", workoutImageRoutes)
  .route("/", userRoutes)
  .route("/", profileRoutes)
  .route("/", commentRoutes)
  .route("/", followRequestRoutes)
  .route("/", storageRoutes);

/** Business route tree used by `hc<AppType>` — excludes docs endpoints. */
export type AppType = typeof routes;

routes.get(
  "/openapi.json",
  openAPIRouteHandler(routes, {
    documentation: openApiDocumentation,
    exclude: ["/openapi.json", "/reference"],
  }),
);

routes.get(
  "/reference",
  Scalar({
    theme: "saturn",
    url: "/openapi.json",
  }),
);

export { routes };
export default routes;
