import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

const groundTextures = [
  "/grounds/rocky_terrain_02_1k/textures/rocky_terrain_02_diff_1k.png",
  "/grounds/rocky_terrain_02_1k/textures/rocky_terrain_02_nor_gl_1k.png",
  "/grounds/rocky_terrain_02_1k/textures/rocky_terrain_02_rough_1k.png",
  "/grounds/pebble_ground_01_1k/textures/pebble_ground_01_diff_1k.png",
  "/grounds/pebble_ground_01_1k/textures/pebble_ground_01_nor_gl_1k.png",
  "/grounds/pebble_ground_01_1k/textures/pebble_ground_01_rough_1k.png",
];

test("renders the login page and 3D scene shell", async ({ page, request }) => {
  await setupClerkTestingToken({ page });
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: /sign in to hope/i })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByLabel(/email address/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel(/password/i)).toHaveCount(0);

  const scene = page.getByLabel("Interactive walking person model");
  await expect(scene).toBeVisible();
  await expect(scene.locator("canvas")).toBeVisible();

  for (const texturePath of groundTextures) {
    const response = await request.get(texturePath);
    expect(response.ok(), texturePath).toBe(true);
  }
});

test("renders public registration with email and username", async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto("/sign-up");
  await expect(page.getByText("Create your account", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByLabel(/email address/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel(/username/i)).toBeVisible({ timeout: 20_000 });
});
