import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { defineConfig } from "@playwright/test";

loadEnvConfig(resolve(__dirname, "../.."));
loadEnvConfig(process.cwd());
process.env.E2E_CLERK_USER_EMAIL ??= "hoangclw@gmail.com";
process.env.CLERK_PUBLISHABLE_KEY ??= process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const e2ePort = process.env.E2E_PORT ?? "3000";
const e2eBaseUrl = process.env.E2E_BASE_URL ?? `http://localhost:${e2ePort}`;

export default defineConfig({
  fullyParallel: true,
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      testIgnore: /global\.setup\.ts/,
      use: { browserName: "chromium" },
    },
  ],
  reporter: "list",
  testDir: "./tests/e2e",
  use: {
    baseURL: e2eBaseUrl,
    launchOptions: {
      args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
    },
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    viewport: {
      height: 1000,
      width: 1440,
    },
    video: "retain-on-failure",
  },
  webServer: {
    command: `pnpm dev --port ${e2ePort}`,
    reuseExistingServer: true,
    timeout: 120_000,
    url: e2eBaseUrl,
  },
});
