import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

const ownerEmail = process.env.E2E_CLERK_USER_EMAIL;

test.describe.configure({ mode: "serial" });

test("supports optimistic likes and editable comments on a workout post", async ({ page }) => {
  test.skip(!ownerEmail, "Set E2E_CLERK_USER_EMAIL to test authenticated social interactions.");

  await page.goto("/");
  await clerk.signIn({ page, emailAddress: ownerEmail as string });
  await page.goto("/auth/continue");
  await page.goto("/feed");
  await expect(page.getByRole("heading", { name: /feed|bảng tin/i })).toBeVisible();

  const workoutLinks = page.getByRole("link", { name: /view workout|xem buổi tập/i });
  if ((await workoutLinks.count()) === 0) {
    test.skip(true, "The isolated E2E profile needs at least one public workout.");
  }
  await workoutLinks.first().click();
  await expect(page).toHaveURL(/\/workouts\/[^/]+/);
  const workoutId = new URL(page.url()).pathname.split("/").at(-1) as string;

  const imageGallery = page.getByRole("region", {
    name: /workout images|ảnh của buổi tập/i,
  });
  if ((await imageGallery.count()) > 0) {
    await imageGallery.getByRole("button").first().click();
    const imageViewer = page.getByRole("dialog", {
      name: /workout image viewer|trình xem ảnh buổi tập/i,
    });
    await expect(imageViewer).toBeVisible();
    const nextImage = imageViewer.getByRole("button", {
      name: /next image|ảnh tiếp theo/i,
    });
    if ((await nextImage.count()) > 0) await nextImage.click();
    await imageViewer.getByRole("button", { name: /close|đóng/i }).click();
    await expect(imageViewer).toHaveCount(0);
  }

  const emptyComment = await page.context().request.post(`/api/workouts/${workoutId}/comments`, {
    data: { body: "   " },
  });
  expect(emptyComment.status()).toBe(400);
  const longComment = await page.context().request.post(`/api/workouts/${workoutId}/comments`, {
    data: { body: "x".repeat(501) },
  });
  expect(longComment.status()).toBe(400);

  const likeButton = page.getByRole("button", { name: /like|thích|unlike|bỏ thích/i });
  const wasLiked = (await likeButton.getAttribute("aria-pressed")) === "true";
  await likeButton.click();
  await expect(likeButton).toHaveAttribute("aria-pressed", wasLiked ? "false" : "true");
  await likeButton.click();
  await expect(likeButton).toHaveAttribute("aria-pressed", wasLiked ? "true" : "false");

  const unique = Date.now();
  const originalComment = `Social E2E ${unique}`;
  const updatedComment = `${originalComment} updated`;
  await page.getByPlaceholder(/write a comment|viết bình luận/i).fill(originalComment);
  await page.getByRole("button", { name: /post|đăng/i }).click();
  const comment = page.locator(`[id^="comment-"]`).filter({ hasText: originalComment });
  await expect(comment).toBeVisible();

  await comment.getByRole("button", { name: /edit|sửa/i }).click();
  await comment.getByRole("textbox").fill(updatedComment);
  await comment.getByRole("button", { name: /save|lưu/i }).click();
  await expect(comment.getByText(updatedComment, { exact: true })).toBeVisible();

  await comment.getByRole("button", { name: /delete|xóa/i }).click();
  await expect(page.getByText(updatedComment, { exact: true })).toHaveCount(0);
});
