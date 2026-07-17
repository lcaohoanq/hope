import { loadEnvConfig } from "@next/env";
import { defineConfig } from "@playwright/test";

loadEnvConfig(process.cwd());
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
      use: { channel: "chromium" },
    },
    {
      name: "firefox",
      dependencies: ["setup"],
      testIgnore: /global\.setup\.ts/,
      use: { browserName: "firefox" },
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
