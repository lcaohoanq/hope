import path from "node:path";
import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

const publicUsername = process.env.E2E_PUBLIC_PROFILE_USERNAME;
const ownerEmail = process.env.E2E_CLERK_USER_EMAIL;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe.configure({ mode: "serial" });

test("rejects signed-out workout and settings mutations", async ({ request }) => {
  const workout = await request.post("/api/workouts", {
    data: { date: "2026-07-13", type: "Run", note: "" },
  });
  expect(workout.status()).toBe(401);

  const imageUpload = await request.post("/api/workout-images", { data: { count: 1 } });
  expect(imageUpload.status()).toBe(401);

  const imageCleanup = await request.delete("/api/workout-images", {
    data: { publicIds: ["hope/workouts/signed-out/image"] },
  });
  expect(imageCleanup.status()).toBe(401);

  const settings = await request.patch("/api/users/settings", { data: { theme: "dark" } });
  expect(settings.status()).toBe(401);

  const privacy = await request.patch("/api/users/privacy", { data: { isPrivate: true } });
  expect(privacy.status()).toBe(401);

  const follow = await request.post("/api/profiles/some-profile/follow");
  expect(follow.status()).toBe(401);

  const feed = await request.get("/api/feed");
  expect(feed.status()).toBe(401);

  const like = await request.post("/api/workouts/missing-workout/like");
  expect(like.status()).toBe(401);

  const unlike = await request.delete("/api/workouts/missing-workout/like");
  expect(unlike.status()).toBe(401);

  const comment = await request.post("/api/workouts/missing-workout/comments", {
    data: { body: "Signed out" },
  });
  expect(comment.status()).toBe(401);

  const editComment = await request.patch("/api/comments/missing-comment", {
    data: { body: "Signed out" },
  });
  expect(editComment.status()).toBe(401);

  const deleteComment = await request.delete("/api/comments/missing-comment");
  expect(deleteComment.status()).toBe(401);

  const notifications = await request.get("/api/notifications");
  expect(notifications.status()).toBe(401);

  const userSearch = await request.get("/api/users/search?q=test");
  expect(userSearch.status()).toBe(401);

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
  test.skip(
    !publicUsername,
    "Set E2E_PUBLIC_PROFILE_USERNAME after seeding the isolated Supabase database.",
  );
  await page.goto(`/@${publicUsername}`);
  await expect(page).toHaveURL(`/${publicUsername}`);
  await expect(page.getByRole("button", { name: /add a workout/i })).toHaveCount(0);
});

test("shows compact contribution metadata using the posted timestamp", async ({ page }) => {
  await page.route("**/api/workouts/activity?**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        nextCursor: null,
        workouts: [
          {
            id: "activity-public",
            userId: "test",
            date: "2026-07-13",
            type: "Long caption workout",
            startTime: "09:00",
            endTime: "10:15",
            durationMinutes: 75,
            note: "A deliberately long caption that should stay separate from the posted time",
            images: [
              {
                src: "/apple-touch-icon.png",
                format: "webp",
                width: 180,
                height: 180,
                sizeBytes: 1024,
              },
              {
                src: "/apple-touch-icon.png",
                format: "webp",
                width: 180,
                height: 180,
                sizeBytes: 1024,
              },
            ],
            createdAt: "2026-07-14T14:12:00.000Z",
            isPublic: true,
          },
          {
            id: "activity-private",
            userId: "test",
            date: "2026-07-12",
            type: "Private workout",
            startTime: "08:00",
            endTime: "08:30",
            durationMinutes: 30,
            createdAt: "2026-07-13T02:00:00.000Z",
            isPublic: false,
          },
        ],
      }),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.goto("/test");
  const activity = page.getByRole("heading", { name: "Contribution activity" }).locator("..");
  const publicWorkout = activity.getByRole("link", { name: /Long caption workout/i });

  await expect(publicWorkout).toHaveAttribute("href", "/workouts/activity-public");
  await expect(activity.getByText(/75 min|75 phút/i)).toBeVisible();
  await expect(activity.getByText(/2 images|2 ảnh/i)).toBeVisible();
  await expect(activity.locator("time:visible").filter({ hasText: "21:12" })).toBeVisible();
  await expect(activity.getByText("09:00 - 10:15")).toHaveCount(0);
  await expect(activity.getByText(/^(Private|Riêng tư)$/i)).toBeVisible();
  await expect(activity.getByRole("link", { name: /Private workout/i })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  const hasHorizontalOverflow = await activity.evaluate(
    (element) => element.scrollWidth > element.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("shows owner controls to the linked Clerk account", async ({ page }) => {
  test.skip(
    !publicUsername || !ownerEmail,
    "Set E2E public profile and Clerk test user variables.",
  );
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: ownerEmail! });
  await page.goto("/auth/continue");
  await expect(page).toHaveURL(`/${publicUsername}`);

  const invalidUploadCount = await page.context().request.post("/api/workout-images", {
    data: { count: 4 },
  });
  expect(invalidUploadCount.status()).toBe(400);

  const foreignImageCleanup = await page.context().request.delete("/api/workout-images", {
    data: { publicIds: ["hope/workouts/another-profile/image"] },
  });
  expect(foreignImageCleanup.status()).toBe(400);

  await expect(page.getByRole("button", { name: /add a workout/i })).toBeVisible();
  await page.getByRole("button", { name: /add a workout/i }).click();
  const workoutDialog = page.getByRole("dialog", {
    name: /log a workout|ghi lại buổi tập/i,
  });
  await expect(workoutDialog).toBeVisible();
  await expect(workoutDialog.locator('input[type="time"]')).toHaveCount(0);

  const imageStrip = workoutDialog.getByTestId("workout-image-strip");
  const imageInput = workoutDialog.locator('input[type="file"][multiple]');
  const initialStripHeight = await imageStrip.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  const firstImage = path.join(process.cwd(), "public/icon-192.png");
  const secondImage = path.join(process.cwd(), "public/icon-512.png");
  const thirdImage = path.join(process.cwd(), "public/apple-touch-icon.png");

  await imageInput.setInputFiles([firstImage, secondImage]);
  await expect(workoutDialog.getByTestId("workout-image-preview")).toHaveCount(2);

  await imageInput.setInputFiles(firstImage);
  await expect(workoutDialog.getByTestId("workout-image-preview")).toHaveCount(2);

  await imageInput.setInputFiles(thirdImage);
  await expect(workoutDialog.getByTestId("workout-image-preview")).toHaveCount(3);
  await expect(
    workoutDialog.getByRole("button", { name: /3 images added|đã đủ 3 ảnh/i }),
  ).toBeDisabled();

  await workoutDialog.getByTestId("workout-image-remove").first().click();
  await expect(workoutDialog.getByTestId("workout-image-preview")).toHaveCount(2);
  expect(await imageStrip.evaluate((element) => element.getBoundingClientRect().height)).toBe(
    initialStripHeight,
  );

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await workoutDialog
    .getByRole("button", { name: /close workout form|đóng biểu mẫu tập luyện/i })
    .click();

  await page.getByRole("button", { name: /profile|hồ sơ/i }).click();
  await page.getByRole("link", { name: /settings|cài đặt/i }).click();
  await expect(page).toHaveURL("/settings");
  await expect(page.getByRole("link", { name: /edit profile|chỉnh sửa hồ sơ/i })).toHaveAttribute(
    "href",
    "/settings/profile",
  );
  await expect(
    page.getByRole("link", { name: /manage plan|quản lý gói|upgrade to pro|nâng cấp pro/i }),
  ).toHaveAttribute("href", "/pricing");
});

test("searches users from dashboard and social headers", async ({ page }) => {
  const username = publicUsername;
  const email = ownerEmail;
  test.skip(!username || !email, "Set E2E public profile and Clerk test user variables.");
  if (!username || !email) return;

  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
  await page.goto("/auth/continue");
  await expect(page).toHaveURL(`/${username}`);

  const searchResponse = await page
    .context()
    .request.get(`/api/users/search?q=${encodeURIComponent(username)}`);
  expect(searchResponse.ok()).toBe(true);
  const searchPayload = (await searchResponse.json()) as {
    success: boolean;
    users?: Array<{ username: string }>;
  };
  expect(searchPayload.success).toBe(true);
  expect(searchPayload.users?.some((user) => user.username === username)).toBe(true);

  const resultName = new RegExp(`@${escapeRegExp(username)}`, "i");
  await page.getByRole("searchbox", { name: /search users|tìm người dùng/i }).fill(username);
  await page.getByRole("option", { name: resultName }).click();
  await expect(page).toHaveURL(`/${username}`);

  await page.goto("/feed");
  await expect(page.getByRole("heading", { name: /feed|bảng tin/i })).toBeVisible();
  await page.getByRole("searchbox", { name: /search users|tìm người dùng/i }).fill(username);
  await page.getByRole("option", { name: resultName }).click();
  await expect(page).toHaveURL(`/${username}`);

  await page
    .getByRole("searchbox", { name: /search users|tìm người dùng/i })
    .fill("zz-no-user-e2e");
  await expect(page.getByText(/no users found|không tìm thấy người dùng/i)).toBeVisible();
});

test("lets the owner reposition and crop an avatar before upload", async ({ page }) => {
  test.skip(
    !publicUsername || !ownerEmail,
    "Set E2E public profile and Clerk test user variables.",
  );
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: ownerEmail! });
  await page.goto(`/${publicUsername}`);

  const avatarInput = page.locator('input[type="file"][accept="image/jpeg,image/png,image/webp"]');
  const imagePath = path.join(process.cwd(), "public/apple-touch-icon.png");

  await avatarInput.setInputFiles(imagePath);
  const dialog = page.getByRole("dialog", {
    name: /adjust profile picture|điều chỉnh ảnh đại diện/i,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/drag the image|kéo ảnh/i)).toBeVisible();
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
  test.skip(
    !publicUsername || !ownerEmail,
    "Set E2E public profile and Clerk test user variables.",
  );
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
