import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Monorepo: Clerk/API secrets live in the repo root `.env*`, not only `apps/web/.env*`.
const monorepoRoot = resolve(__dirname, "../..");
loadEnvConfig(monorepoRoot);
loadEnvConfig(__dirname);

const nextConfig: NextConfig = {
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
  transpilePackages: ["@hope/shared", "@hope/api-client"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/10.x/notionists/svg",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/api/storage/**",
      },
    ],
  },
};

export default nextConfig;
