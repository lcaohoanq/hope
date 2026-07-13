import { expect, type Page, test } from "@playwright/test";

async function signIn(page: Page, username: string, password: string) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      nextPath: `/${username}`,
      password,
      username,
    },
  });

  expect(response.ok()).toBe(true);
  await page.goto(`/${username}`);
  await expect(page).toHaveURL(`/${username}`);
}

test("renders a public username profile with workout data while logged out", async ({
  page,
}) => {
  await page.goto("/hoang");

  await expect(page.getByRole("heading", { name: "Hoang Cao Luu" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("2026-07-10: 2 workouts")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add a workout" }),
  ).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Theme" })).toHaveCount(0);
});

test("redirects legacy slug URLs to canonical username URLs", async ({ page }) => {
  await page.goto("/%40hoang");

  await expect(page).toHaveURL("/hoang");
});

test("shows other signed-in user profiles as read-only", async ({ page }) => {
  await signIn(page, "hoang", "123");

  await page.goto("/mviet");

  await expect(page).toHaveURL("/mviet");
  await expect(page.getByRole("heading", { name: "Minh Viet" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add a workout" }),
  ).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Theme" })).toHaveCount(0);
  await expect(page.getByTitle("Upload avatar")).toHaveCount(0);

  await page.getByLabel("2026-07-11: 1 workout").click();
  await expect(
    page.getByRole("heading", { name: "walking around galaxy hub" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit workout" })).toHaveCount(0);
});

test("keeps owner profile controls available", async ({ page }) => {
  await signIn(page, "hoang", "123");

  await expect(
    page.getByRole("button", { name: "Add a workout" }),
  ).toBeVisible();
  await expect(page.getByRole("group", { name: "Theme" })).toBeVisible();
  await expect(page.getByTitle("Upload avatar")).toBeVisible();

  await page.getByLabel("2026-07-10: 2 workouts").click();
  await expect(page.getByRole("button", { name: "Edit workout" }).first()).toBeVisible();
});

test("persists the owner theme setting across reloads", async ({ page }) => {
  await signIn(page, "hoang", "123");

  await page.getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Dark" })).toBeEnabled();

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Dark" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "Light" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("button", { name: "Light" })).toBeEnabled();
});
