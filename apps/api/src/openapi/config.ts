import type { OpenAPIV3_1 } from "openapi-types";

/** Shared OpenAPI document metadata for the Hope HTTP API. */
export const openApiDocumentation = {
  info: {
    title: "Hope API",
    version: "0.1.0",
    description:
      "HTTP API for Hope workout tracking. Authenticate with a Clerk session JWT (`Authorization: Bearer …`).",
  },
  tags: [
    { name: "Health", description: "Liveness probes" },
    { name: "Feed", description: "Social workout feed" },
    { name: "Workouts", description: "Workout CRUD, activity, likes, comments" },
    { name: "ActivityTypes", description: "Activity type catalog and scoring weights" },
    { name: "Leaderboard", description: "Mutual-friends points leaderboard" },
    { name: "Users", description: "Current user, profile, settings, search, avatar" },
    { name: "Profiles", description: "Public profiles, follow graph, connections" },
    { name: "Comments", description: "Edit/delete workout comments" },
    { name: "Notifications", description: "In-app notifications" },
    { name: "Storage", description: "Object storage proxy (MinIO)" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Clerk session JWT",
      },
    },
  },
  security: [{ bearerAuth: [] }],
} satisfies Partial<OpenAPIV3_1.Document>;
