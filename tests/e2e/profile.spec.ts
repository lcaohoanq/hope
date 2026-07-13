import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import path from "node:path";

const publicUsername = process.env.E2E_PUBLIC_PROFILE_USERNAME;
const ownerEmail = process.env.E2E_CLERK_USER_EMAIL;

test.describe.configure({ mode: "serial" });

test("rejects signed-out workout and settings mutations", async ({ request }) => {
  const workout = await request.post("/api/workouts", {
    data: { date: "2026-07-13", type: "Run", startTime: "08:00", endTime: "08:30", note: "" },
  });
  expect(workout.status()).toBe(401);

  const settings = await request.patch("/api/users/settings", { data: { theme: "dark" } });
  expect(settings.status()).toBe(401);

  const privacy = await request.patch("/api/users/privacy", { data: { isPrivate: true } });
  expect(privacy.status()).toBe(401);

  const follow = await request.post("/api/profiles/some-profile/follow");
  expect(follow.status()).toBe(401);

  const feed = await request.get("/api/feed");
  expect(feed.status()).toBe(401);

  const notifications = await request.get("/api/notifications");
  expect(notifications.status()).toBe(401);

  const profile = await request.patch("/api/users/profile", {
    data: {
      displayName: "Signed out user",
      birthYear: 2000,
      bio: { en: "", vi: "" },
    },
  });
  expect(profile.status()).toBe(401);

  const settingsPage = await request.get("/settings/profile", {
    maxRedirects: 0,
  });
  expect(settingsPage.status()).toBe(307);
  expect(settingsPage.headers().location).toContain("/login?next=%2Fsettings%2Fprofile");
});

test("keeps a migrated profile public and canonical", async ({ page }) => {
  test.skip(!publicUsername, "Set E2E_PUBLIC_PROFILE_USERNAME after seeding the isolated Supabase database.");
  await page.goto(`/@${publicUsername}`);
  await expect(page).toHaveURL(`/${publicUsername}`);
  await expect(page.getByRole("button", { name: /add a workout/i })).toHaveCount(0);
});

test("shows owner controls to the linked Clerk account", async ({ page }) => {
  test.skip(!publicUsername || !ownerEmail, "Set E2E public profile and Clerk test user variables.");
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: ownerEmail! });
  await page.goto("/auth/continue");
  await expect(page).toHaveURL(`/${publicUsername}`);
  await expect(page.getByRole("button", { name: /add a workout/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /edit profile|chỉnh sửa hồ sơ/i })).toHaveAttribute(
    "href",
    "/settings/profile",
  );
});

test("lets the owner reposition and crop an avatar before upload", async ({ page }) => {
  test.skip(!publicUsername || !ownerEmail, "Set E2E public profile and Clerk test user variables.");
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: ownerEmail! });
  await page.goto(`/${publicUsername}`);

  const avatarInput = page.locator(
    'input[type="file"][accept="image/jpeg,image/png,image/webp"]',
  );
  const imagePath = path.join(process.cwd(), "public/apple-touch-icon.png");

  await avatarInput.setInputFiles(imagePath);
  const dialog = page.getByRole("dialog", {
    name: /adjust profile picture|điều chỉnh ảnh đại diện/i,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText(/drag the image|kéo ảnh/i),
  ).toBeVisible();
  await dialog.getByRole("slider").fill("1.5");
  await dialog.getByRole("button", { name: /cancel|hủy/i }).click();
  await expect(dialog).toBeHidden();

  let uploadedBody: Buffer | null = null;
  await page.route("**/api/users/avatar", async (route) => {
    uploadedBody = route.request().postDataBuffer();
    await route.fulfill({
      body: JSON.stringify({
        success: true,
        avatarUrl: "/apple-touch-icon.png",
      }),
      contentType: "application/json",
      status: 200,
    });
  });

  await avatarInput.setInputFiles(imagePath);
  await expect(dialog).toBeVisible();
  const saveButton = dialog.getByRole("button", {
    name: /save photo|lưu ảnh/i,
  });
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
  await expect(dialog).toBeHidden();

  expect(uploadedBody).not.toBeNull();
  const multipart = uploadedBody!.toString("latin1");
  expect(multipart).toContain('name="avatar"');
  expect(multipart).toContain("-cropped.webp");
  expect(multipart).toContain("image/webp");
});

test("validates and updates the owner's public profile", async ({ page }) => {
  test.skip(!publicUsername || !ownerEmail, "Set E2E public profile and Clerk test user variables.");
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: ownerEmail! });
  await page.goto("/settings/profile");
  await expect(page).toHaveURL("/settings/profile");

  const fields = {
    displayName: page.locator('[name="displayName"]'),
    birthYear: page.locator('[name="birthYear"]'),
    bioEn: page.locator('[name="bio.en"]'),
    bioVi: page.locator('[name="bio.vi"]'),
    pronounsEn: page.locator('[name="pronouns.en"]'),
    pronounsVi: page.locator('[name="pronouns.vi"]'),
    website: page.locator('[name="website"]'),
    facebook: page.locator('[name="socialLinks.facebook"]'),
    instagram: page.locator('[name="socialLinks.instagram"]'),
    linkedin: page.locator('[name="socialLinks.linkedin"]'),
  };
  const original = {
    displayName: await fields.displayName.inputValue(),
    birthYear: Number(await fields.birthYear.inputValue()),
    bio: {
      en: await fields.bioEn.inputValue(),
      vi: await fields.bioVi.inputValue(),
    },
    pronouns: {
      en: await fields.pronounsEn.inputValue(),
      vi: await fields.pronounsVi.inputValue(),
    },
    website: await fields.website.inputValue(),
    socialLinks: {
      facebook: await fields.facebook.inputValue(),
      instagram: await fields.instagram.inputValue(),
      linkedin: await fields.linkedin.inputValue(),
    },
  };

  await fields.website.fill("javascript:alert(1)");
  await page.getByRole("button", { name: /save changes|lưu thay đổi/i }).click();
  await expect(page).toHaveURL("/settings/profile");
  await expect(fields.website).toHaveAttribute("aria-invalid", "true");

  const rejected = await page.context().request.patch("/api/users/profile", {
    data: { ...original, username: "must-not-change" },
  });
  expect(rejected.status()).toBe(400);

  const updatedDisplayName = `Hope E2E ${Date.now()}`;
  await fields.website.fill(original.website);
  await fields.displayName.fill(updatedDisplayName);

  try {
    await page.getByRole("button", { name: /save changes|lưu thay đổi/i }).click();
    await expect(page).toHaveURL(`/${publicUsername}`);
    await expect(
      page.getByRole("heading", { name: updatedDisplayName, exact: true }),
    ).toBeVisible();
  } finally {
    const restored = await page.context().request.patch("/api/users/profile", {
      data: original,
    });
    expect(restored.ok()).toBeTruthy();
  }
});
