import { clerk } from "@clerk/testing/playwright";
import { expect, type Page, test } from "@playwright/test";

const ownerEmail = process.env.E2E_CLERK_USER_EMAIL;
const publicUsername = process.env.E2E_PUBLIC_PROFILE_USERNAME;

test.describe.configure({ mode: "serial" });

test("creates, shares, and downloads owner stories while hiding the action from visitors", async ({
  browser,
  page,
}) => {
  test.skip(
    !ownerEmail || !publicUsername,
    "Set E2E_CLERK_USER_EMAIL and E2E_PUBLIC_PROFILE_USERNAME to test social stories.",
  );

  const workoutDate = getTodayInAppTimezone();
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: ownerEmail as string });
  await mockDashboardWorkout(page, workoutDate);
  await page.goto("/auth/continue");
  await expect(page).toHaveURL(`/${publicUsername}`);

  await page.getByRole("button", { name: new RegExp(`^${workoutDate}:`) }).click();
  const createStoryButton = page.getByRole("button", { name: /create story|tạo story/i });
  await expect(createStoryButton).toBeVisible();
  await createStoryButton.click();

  const storyDialog = page.getByRole("dialog", { name: /create a story|tạo story/i });
  await expect(storyDialog).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await expect(storyDialog.locator(".swiper-slide")).toHaveCount(3);

  const canvases = storyDialog.getByTestId("social-story-canvas");
  await expect(canvases).toHaveCount(3);
  for (const canvas of await canvases.all()) {
    await expect(canvas).toHaveAttribute("width", "1080");
    await expect(canvas).toHaveAttribute("height", "1920");
  }

  await expect(storyDialog).toHaveAttribute("data-active-template", "photo-first");
  await page.keyboard.press("ArrowRight");
  await expect(storyDialog).toHaveAttribute("data-active-template", "bold-stat");

  const explicitDownload = page.waitForEvent("download");
  await storyDialog.getByRole("button", { name: /download png|tải png/i }).click();
  await expect((await explicitDownload).suggestedFilename()).toContain("bold-stat.png");

  await page.evaluate(() => {
    const storyWindow = window as Window & {
      __storySharedFilename?: string;
    };
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        storyWindow.__storySharedFilename = data.files?.[0]?.name;
      },
    });
  });

  await storyDialog.getByRole("button", { name: /share story|chia sẻ story/i }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __storySharedFilename?: string }).__storySharedFilename ?? "",
      ),
    )
    .toContain("bold-stat.png");

  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        throw new Error("Native share failed");
      },
    });
  });
  await storyDialog.getByRole("button", { name: /share story|chia sẻ story/i }).click();
  await expect(storyDialog.getByRole("alert")).toContainText(
    /could not be shared|không thể chia sẻ/i,
  );

  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => false,
    });
  });
  const fallbackDownload = page.waitForEvent("download");
  await storyDialog.getByRole("button", { name: /share story|chia sẻ story/i }).click();
  await expect((await fallbackDownload).suggestedFilename()).toContain("bold-stat.png");

  await page.getByTestId("social-story-backdrop").click({ position: { x: 2, y: 2 } });
  await expect(storyDialog).toHaveCount(0);
  await expect(createStoryButton).toBeVisible();

  await createStoryButton.click();
  await expect(storyDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(storyDialog).toHaveCount(0);

  await page.getByRole("button", { name: /close workout detail|đóng chi tiết buổi tập/i }).click();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");

  await page.unroute("**/api/workouts?**");
  await mockDashboardWorkout(page, workoutDate, false);
  await page.reload();
  await page.getByRole("button", { name: new RegExp(`^${workoutDate}:`) }).click();
  await expect(page.getByRole("button", { name: /create story|tạo story/i })).toHaveCount(0);

  const visitorContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
  const visitorPage = await visitorContext.newPage();
  try {
    await mockDashboardWorkout(visitorPage, workoutDate);
    await visitorPage.goto(`/${publicUsername}`);
    await visitorPage.getByRole("button", { name: new RegExp(`^${workoutDate}:`) }).click();
    await expect(visitorPage.getByRole("button", { name: /create story|tạo story/i })).toHaveCount(
      0,
    );
  } finally {
    await visitorContext.close();
  }
});

async function mockDashboardWorkout(page: Page, workoutDate: string, includeImage = true) {
  await page.route("**/api/workouts?**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        settings: { timezone: "Asia/Ho_Chi_Minh" },
        workouts: [
          {
            createdAt: `${workoutDate}T01:00:00.000Z`,
            date: workoutDate,
            durationMinutes: 75,
            endTime: "08:15",
            id: "social-story-e2e",
            images: includeImage
              ? [
                  {
                    format: "jpg",
                    height: 180,
                    sizeBytes: 1024,
                    src: "/apple-touch-icon.png",
                    width: 180,
                  },
                ]
              : [],
            isPublic: true,
            note: "A bright morning session",
            startTime: "07:00",
            type: "Morning run",
            userId: "owner",
          },
        ],
      }),
      contentType: "application/json",
      status: 200,
    });
  });
}

function getTodayInAppTimezone() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
  }).format(new Date());
}
