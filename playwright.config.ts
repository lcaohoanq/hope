import { defineConfig } from "@playwright/test";

export default defineConfig({
  fullyParallel: true,
  reporter: "list",
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://localhost:3000",
    channel: "chromium",
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
    command: "pnpm dev",
    reuseExistingServer: true,
    timeout: 120_000,
    url: "http://localhost:3000",
  },
});
