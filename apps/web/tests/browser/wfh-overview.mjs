// Isolated browser coverage of the real component, with Clerk and HTTP fixtures.
// Run from apps/web: node tests/browser/wfh-overview.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const web = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const postcss = require("postcss");
const tailwind = require("tailwindcss");
const { loadConfig } = require("tailwindcss/lib/lib/load-config");
const config = loadConfig(`${web}/tailwind.config.ts`);
config.content = [`${web}/components/wfh/*.tsx`];
const css = (
  await postcss([tailwind(config)]).process(readFileSync(`${web}/app/globals.css`, "utf8"), {
    from: `${web}/app/globals.css`,
  })
).css;
const bundle = await build({
  stdin: {
    contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {WfhTracker} from './components/wfh/WfhTracker'; createRoot(document.getElementById('root')).render(<WfhTracker language={window.testLanguage || 'en'}/>);`,
    resolveDir: web,
    loader: "tsx",
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  tsconfig: `${web}/tsconfig.json`,
  define: {
    "process.env.NODE_ENV": '"development"',
    "process.env.NEXT_PUBLIC_API_URL": '"http://wfh.test/api"',
  },
  plugins: [
    {
      name: "auth-fixture",
      setup(builder) {
        builder.onResolve({ filter: /^@clerk\/nextjs$/ }, () => ({
          path: "auth",
          namespace: "fixture",
        }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents:
            'const getToken = async () => "test"; export const useAuth = () => ({getToken});',
        }));
      },
    },
  ],
});
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
try {
  for (const width of [1280, 390, 320]) {
    for (const theme of ["light", "dark"]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.clock.install({ time: new Date("2026-09-18T05:00:00Z") });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      let settings = { startDate: "2026-01-02", endDate: null, reminderEnabled: true };
      const quotas = new Map();
      const records = [2, 5, 6, 7, 8, 9, 12, 13].map((day) => ({
        date: `2026-01-${String(day).padStart(2, "0")}`,
        status: "WFH",
        note: "",
      }));
      let failNext = false;
      let failAtDate = "";
      let releaseSave;
      let holdSave = false;
      await page.route("http://wfh.test/**", async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        if (url.pathname === "/")
          return route.fulfill({
            contentType: "text/html",
            body: `<html data-theme="${theme}" style="--font-geist-sans:Arial;--font-geist-mono:monospace"><body><main id="root" style="max-width:1100px;margin:auto;padding:16px"></main></body></html>`,
          });
        const data = ["PATCH", "POST"].includes(request.method()) ? request.postDataJSON() : null;
        if (data && holdSave)
          await new Promise((resolve) => {
            releaseSave = resolve;
          });
        if (data && (failNext || data.date === failAtDate)) {
          failAtDate = "";
          failNext = false;
          return route.fulfill({
            status: 500,
            contentType: "application/json",
            body: '{"error":"Temporary save failure"}',
          });
        }
        let body;
        if (url.pathname.endsWith("/settings")) {
          if (data) settings = data;
          body = { settings };
        } else if (url.pathname.endsWith("/allowance")) {
          if (data) quotas.set(data.year, data.totalDays);
          body = {
            allowance: {
              totalDays: quotas.get(data?.year ?? Number(url.searchParams.get("year"))) ?? 45,
            },
          };
        } else if (request.method() === "POST") {
          const index = records.findIndex((record) => record.date === data.date);
          if (index >= 0) records[index] = data;
          else records.push(data);
          body = { record: data };
        } else if (request.method() === "DELETE") {
          const date = url.pathname.split("/").at(-1);
          const index = records.findIndex((record) => record.date === date);
          if (index >= 0) records.splice(index, 1);
          body = { success: true };
        } else
          body = {
            records: records.filter((record) =>
              record.date.startsWith(url.searchParams.get("year")),
            ),
          };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
      });
      await page.goto("http://wfh.test/");
      await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      const overview = page.getByRole("region", { name: "WFH overview" });
      await expect(overview).toContainText("37 days left");
      await expect(overview).toContainText("8 of 45 used");
      await expect(overview).not.toContainText("WFH rate");
      await expect(overview).not.toContainText("recorded workdays");
      await expect(overview.getByRole("button", { name: "Edit quota", exact: true })).toHaveCount(
        0,
      );
      assert.ok(
        Math.abs(
          Number(await page.getByRole("progressbar").getAttribute("aria-valuenow")) - 17.78,
        ) < 0.01,
      );
      await expect(page.getByRole("heading", { name: "Did you WFH today?" })).toBeVisible();
      for (const date of ["2026-01-01", "2026-09-19", "2026-09-20", "2026-09-21"])
        await expect(page.getByRole("button", { name: new RegExp(`^${date}:`) })).toBeDisabled();
      await page.screenshot({ path: `/tmp/wfh-example-${theme}-${width}.png` });
      const todayPrompt = page.getByRole("heading", { name: "Did you WFH today?" });
      failNext = true;
      await page.getByRole("button", { name: "Yes · WFH", exact: true }).click();
      await expect(page.getByRole("alert")).toContainText("Temporary save failure");
      await expect(todayPrompt).toBeVisible();
      for (const location of ["WFH", "Office"]) {
        await page
          .getByRole("button", {
            name: location === "WFH" ? "Yes · WFH" : "No · Office",
            exact: true,
          })
          .click();
        await expect(todayPrompt).toHaveCount(0);
        await page.reload();
        await page.addStyleTag({ content: css });
        await page.addScriptTag({ content: bundle.outputFiles[0].text });
        const recordedDay = page.getByRole("button", {
          name: `2026-09-18: ${location}`,
          exact: true,
        });
        await expect(recordedDay).toBeEnabled();
        await expect(todayPrompt).toHaveCount(0);
        await recordedDay.click();
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Work from home", exact: true })
          .click();
        await page.getByRole("button", { name: "Clear record", exact: true }).click();
        await expect(page.getByRole("dialog", { name: "Work from home" })).toBeHidden();
        await expect(todayPrompt).toBeVisible();
      }
      const calendarDay = page.getByRole("button", { name: /^2026-09-17:/ });
      await calendarDay.click();
      const choice = page.getByRole("dialog", { name: "Where did you work?", exact: true });
      await expect(choice).toBeVisible();
      await expect(choice.getByRole("textbox")).toHaveCount(0);
      await choice.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(calendarDay).toHaveAttribute("aria-label", "2026-09-17: Not recorded");
      await calendarDay.click();
      failNext = true;
      await choice.getByRole("button", { name: "At the office", exact: true }).click();
      await expect(choice.getByRole("alert")).toContainText("Temporary save failure");
      await choice.getByRole("button", { name: "At the office", exact: true }).click();
      await expect(choice).toBeHidden();
      await expect(calendarDay).toHaveAttribute("aria-label", "2026-09-17: Office");
      await expect(calendarDay).toHaveClass(/bg-blue-600/);
      await calendarDay.click();
      await expect(
        choice.getByRole("button", { name: "At the office", exact: true }),
      ).toContainText("Current");
      await page.screenshot({ path: `/tmp/wfh-choice-${theme}-${width}.png` });
      await choice.getByRole("button", { name: "Work from home", exact: true }).click();
      const workdayForm = page.getByRole("dialog", { name: "Work from home", exact: true });
      await expect(workdayForm.getByRole("combobox")).toHaveCount(0);
      await expect(workdayForm.getByRole("textbox")).toBeFocused();
      await expect(calendarDay).toHaveAttribute("aria-label", "2026-09-17: Office");
      await workdayForm.getByRole("textbox").fill("Working from home");
      await workdayForm.getByRole("button", { name: "Back", exact: true }).click();
      await expect(
        choice.getByRole("button", { name: "Work from home", exact: true }),
      ).toBeFocused();
      await choice.getByRole("button", { name: "Work from home", exact: true }).click();
      await expect(workdayForm.getByRole("textbox")).toHaveValue("Working from home");
      await page.screenshot({ path: `/tmp/wfh-form-${theme}-${width}.png` });
      await workdayForm.getByRole("button", { name: "Save WFH", exact: true }).click();
      await expect(workdayForm).toBeHidden();
      await expect(calendarDay).toHaveClass(/bg-emerald-600/);
      await calendarDay.click();
      await choice.getByRole("button", { name: "Work from home", exact: true }).click();
      await expect(workdayForm.getByRole("textbox")).toHaveValue("Working from home");
      await workdayForm.getByRole("button", { name: "Clear record", exact: true }).click();
      await expect(workdayForm).toBeHidden();
      const editSettings = page.getByRole("button", { name: "Edit settings", exact: true });
      await editSettings.click();
      let dialog = page.getByRole("dialog", { name: "WFH settings · 2026" });
      await expect(dialog.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
      await page.getByLabel(/^Annual quota · /).fill("50");
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await expect(editSettings).toBeFocused();
      await editSettings.click();
      await expect(page.getByLabel(/^Annual quota · /)).toHaveValue("45");
      for (let index = 0; index < 8; index++) {
        await page.keyboard.press(index < 4 ? "Tab" : "Shift+Tab");
        assert.equal(await dialog.evaluate((el) => el.contains(document.activeElement)), true);
      }
      await page.keyboard.press("Escape");
      await expect(editSettings).toBeFocused();
      await editSettings.click();
      await page.getByLabel(/^Annual quota · /).fill("0");
      failNext = true;
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await expect(dialog.getByRole("alert")).toContainText(
        "Some changes were not saved. Retry to continue.",
      );
      await expect(page.getByLabel(/^Annual quota · /)).toHaveValue("0");
      holdSave = true;
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await expect(dialog.getByRole("button", { name: "Saving…" })).toBeDisabled();
      await expect(dialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
      await expect.poll(() => Boolean(releaseSave)).toBe(true);
      releaseSave();
      holdSave = false;
      await expect(dialog).toBeHidden();
      await expect(overview).toContainText("0 days left");
      await expect(overview).toContainText("8 days over allowance");
      await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
      await expect(page.getByRole("status")).toHaveText("WFH settings saved.");
      await editSettings.click();
      await page.getByLabel(/^Annual quota · /).fill("8");
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(overview).toContainText("0 days left");
      await expect(overview).not.toContainText("days over allowance");
      await page.getByLabel("Year", { exact: true }).fill("2025");
      await expect(overview).toContainText("45 days left");
      await editSettings.click();
      dialog = page.getByRole("dialog", { name: "WFH settings · 2025" });
      await page.getByLabel(/^Annual quota · /).fill("0");
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
      await page.getByLabel("Year", { exact: true }).fill("2026");
      await expect(overview).toContainText("8 of 8 used");
      await editSettings.click();
      dialog = page.getByRole("dialog", { name: "WFH settings · 2026" });
      await expect(dialog.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
      await page.getByLabel("First working day").fill("2026-01-05");
      await page.getByLabel("Last working day (optional)").fill("2026-09-17");
      await page.getByRole("checkbox").uncheck();
      await page.getByLabel(/^Annual quota · /).fill("9");
      failNext = true;
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await expect(dialog.getByRole("alert")).toBeVisible();
      await expect(page.getByLabel("First working day")).toHaveValue("2026-01-05");
      await expect(page.getByLabel(/^Annual quota · /)).toHaveValue("9");
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(editSettings).toBeFocused();
      await expect(
        overview.getByRole("button", { name: "Edit settings", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Jan 5, 2026 – Sep 17, 2026 · Mon–Fri · Reminders off"),
      ).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Did you WFH today?" })).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "2026-09-18: Not recorded", exact: true }),
      ).toBeDisabled();
      await page.getByRole("button", { name: "2026-09-17: Not recorded", exact: true }).click();
      await expect(
        page.getByRole("dialog", { name: "Where did you work?", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
      await page.screenshot({ path: `/tmp/wfh-overview-${theme}-${width}.png`, fullPage: true });
      await editSettings.click();
      assert.equal(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth), true);
      await page.screenshot({ path: `/tmp/wfh-settings-${theme}-${width}.png` });
      await page.keyboard.press("Escape");
      const rangeStart = page.getByRole("button", { name: /^2026-08-06:/, includeHidden: true });
      const rangeEnd = page.getByRole("button", { name: /^2026-08-21:/, includeHidden: true });
      async function dragDates(from, to) {
        await from.scrollIntoViewIfNeeded();
        await to.scrollIntoViewIfNeeded();
        const a = await from.boundingBox(),
          b = await to.boundingBox();
        await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
        await page.mouse.down();
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
        await page.mouse.up();
      }
      await dragDates(rangeStart, rangeEnd);
      const rangePanel = page.getByRole("dialog", { name: "Selected date range", exact: true });
      await expect(rangePanel).toContainText("12 eligible workdays selected.");
      await expect(page.locator('button[data-wfh-date][aria-pressed="true"]')).toHaveCount(12);
      await expect(rangePanel).toBeVisible();
      const modalBox = await rangePanel.boundingBox();
      assert.ok(Math.abs(modalBox.x + modalBox.width / 2 - width / 2) < 2);
      assert.ok(Math.abs(modalBox.y + modalBox.height / 2 - 450) < 2);
      assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
      await page.screenshot({ path: `/tmp/wfh-range-drag-${theme}-${width}.png` });
      await page.keyboard.press("Escape");
      await expect(rangePanel).toBeHidden();
      await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
      await expect(rangeStart).toHaveAttribute("aria-label", "2026-08-06: Not recorded");
      await dragDates(rangeEnd, rangeStart);
      await expect(rangePanel).toContainText("12 eligible workdays selected.");
      failAtDate = "2026-08-07";
      await rangePanel.getByRole("button", { name: "Record office days", exact: true }).click();
      await expect(rangePanel.getByRole("alert")).toContainText("Saved 1 of 12 days");
      await expect(rangeStart).toHaveAttribute("aria-label", "2026-08-06: Office");
      await rangePanel.getByRole("button", { name: "Record office days", exact: true }).click();
      await expect(rangePanel).toBeHidden();
      await expect(rangeEnd).toHaveAttribute("aria-label", "2026-08-21: Office");
      await expect(page.getByRole("status")).toHaveText("Recorded 12 office days.");
      assert.equal(
        records.filter(
          (record) =>
            record.date >= "2026-08-06" &&
            record.date <= "2026-08-21" &&
            record.status === "OFFICE",
        ).length,
        12,
      );
      await page.getByRole("button", { name: "Select date range", exact: true }).click();
      await rangePanel.getByLabel("From date", { exact: true }).fill("2026-08-06");
      await rangePanel.getByLabel("To date", { exact: true }).fill("2026-08-21");
      await expect(rangePanel).toContainText("12 eligible workdays selected.");
      await expect(rangePanel).toContainText("Choosing WFH will change 12 office days.");
      await page.screenshot({ path: `/tmp/wfh-range-${theme}-${width}.png` });
      failAtDate = "2026-08-07";
      await rangePanel.getByRole("button", { name: "Record WFH days", exact: true }).click();
      await expect(rangePanel.getByRole("alert")).toContainText("Saved 1 of 12 days");
      await expect(rangeStart).toHaveAttribute("aria-label", "2026-08-06: WFH");
      await rangePanel.getByRole("button", { name: "Record WFH days", exact: true }).click();
      await expect(rangePanel).toBeHidden();
      await expect(rangeEnd).toHaveAttribute("aria-label", "2026-08-21: WFH");
      await expect(rangeEnd).toHaveClass(/bg-emerald-600/);
      await expect(page.getByRole("status")).toHaveText("Recorded 12 WFH days.");
      assert.equal(
        records.filter(
          (record) =>
            record.date >= "2026-08-06" && record.date <= "2026-08-21" && record.status === "WFH",
        ).length,
        12,
      );
      await expect(overview).toContainText("20 of 9 used");
      settings = null;
      await page.reload();
      await page.addStyleTag({ content: css });
      await page.evaluate(() => {
        window.testLanguage = "vi";
      });
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      await expect(page.getByRole("heading", { name: "Thiết lập theo dõi WFH" })).toBeVisible();
      await page.getByRole("button", { name: "Thiết lập theo dõi", exact: true }).click();
      await page.getByLabel("Ngày bắt đầu", { exact: true }).fill("2026-01-02");
      await page.getByRole("button", { name: "Lưu", exact: true }).click();
      await expect(page.getByRole("button", { name: "Chỉnh sửa cài đặt" })).toBeVisible();
      await expect(page.getByRole("status")).toHaveText("Đã lưu cài đặt WFH.");
      assert.deepEqual(errors, []);
      console.log(
        `PASS ${width}px ${theme}: metrics, quota boundaries, years, drafts, failures/retries, pending save, keyboard, employment, setup, Vietnamese, overflow`,
      );
      await page.close();
    }
  }
} finally {
  await browser.close();
}
