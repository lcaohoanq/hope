import { expect, test } from "@playwright/test";

for (const missingPath of [
  "/route-that-does-not-exist-e2e",
  "/auth/route-that-does-not-exist-e2e",
]) {
  test(`renders the Hope fallback once for ${missingPath}`, async ({ page }) => {
    let notFoundResponses = 0;
    page.on("response", (response) => {
      if (response.status() === 404 && new URL(response.url()).pathname === missingPath) {
        notFoundResponses += 1;
      }
    });

    const response = await page.goto(missingPath);

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
    await expect(page).toHaveTitle("Không tìm thấy trang | Hope");
    await expect(page.getByRole("link", { name: "Về trang chủ" })).toHaveAttribute("href", "/");
    await page.waitForTimeout(2_000);
    expect(notFoundResponses).toBe(1);
  });
}

test("legal navigation points to existing routes", async ({ request }) => {
  const termsResponse = await request.get("/terms-of-service");
  const privacyResponse = await request.get("/privacy-policy");

  expect(termsResponse.ok()).toBe(true);
  expect(privacyResponse.ok()).toBe(true);
});
