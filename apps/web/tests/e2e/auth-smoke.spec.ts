import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

const ownerEmail = process.env.E2E_CLERK_USER_EMAIL ?? "hoangclw@gmail.com";

test.describe.configure({ mode: "serial" });

test("linked Clerk account reaches app without session_mismatch loop", async ({ page }) => {
  test.setTimeout(90_000);
  await setupClerkTestingToken({ page });
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();

  await clerk.signIn({ page, emailAddress: ownerEmail });
  await page.goto("/auth/continue");
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 45_000 });

  const url = page.url();
  expect(url).not.toContain("session_mismatch");
  expect(url).not.toContain("/login");

  // Ready users land on /{username}; new users land on onboarding.
  await expect(page.locator("body")).toBeVisible();
  console.log("auth smoke landed on", url);
});
