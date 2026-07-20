import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Drizzle runs this config from packages/db, while shared secrets live in the monorepo root.
loadEnvConfig(resolve(process.cwd(), "../.."));
loadEnvConfig(process.cwd());

if (!process.env.DIRECT_URL) {
  throw new Error("DIRECT_URL is required to run Drizzle migrations.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DIRECT_URL },
  strict: true,
  verbose: true,
});
