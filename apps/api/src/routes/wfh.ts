import {
  clearWfhCheckIn,
  getWfhAllowance,
  getWfhSettings,
  getWfhStats,
  listWfhRecords,
  saveWfhAllowance,
  saveWfhCheckIn,
  saveWfhSettings,
  WfhValidationError,
} from "@hope/core";
import {
  wfhAllowanceSchema,
  wfhCheckInSchema,
  wfhDateSchema,
  wfhSettingsSchema,
  wfhYearSchema,
} from "@hope/shared";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import type { AppEnv } from "../env";
import { validated } from "../lib/validate";
import { resolveOwner } from "../middleware/auth";
import { bearerSecurity } from "../openapi";

type WfhEnv = AppEnv & { Variables: { wfhProfileId: string } };
const query = z.object({ year: wfhYearSchema });
const docs = (summary: string) =>
  describeRoute({ tags: ["WFH"], summary, security: [...bearerSecurity] });

export const wfhRoutes = new Hono<WfhEnv>()
  .use("/wfh/*", async (c, next) => {
    c.header("Cache-Control", "private, no-store");
    const owner = await resolveOwner(c);
    if (owner.status !== "ready")
      return c.json(
        {
          success: false as const,
          error: owner.status === "signed-out" ? "Unauthorized" : "Onboarding required",
        },
        owner.status === "signed-out" ? 401 : 403,
      );
    c.set("wfhProfileId", owner.profile.id);
    await next();
  })
  .onError((error, c) => {
    if (error instanceof WfhValidationError)
      return c.json({ success: false as const, error: error.message }, 400);
    console.error("WFH request failed", error);
    return c.json({ success: false as const, error: "Could not complete WFH request." }, 500);
  })
  .get("/wfh/settings", docs("Read private WFH settings"), async (c) =>
    c.json({ settings: await getWfhSettings(c.get("wfhProfileId")) }),
  )
  .patch(
    "/wfh/settings",
    docs("Set employment dates and WFH reminders"),
    validated("json", wfhSettingsSchema),
    async (c) =>
      c.json({ settings: await saveWfhSettings(c.get("wfhProfileId"), c.req.valid("json")) }),
  )
  .get("/wfh/check-ins", docs("Read own annual check-ins"), validated("query", query), async (c) =>
    c.json({ records: await listWfhRecords(c.get("wfhProfileId"), c.req.valid("query").year) }),
  )
  .post(
    "/wfh/check-ins",
    docs("Create or correct own daily check-in"),
    validated("json", wfhCheckInSchema),
    async (c) =>
      c.json({ record: await saveWfhCheckIn(c.get("wfhProfileId"), c.req.valid("json")) }),
  )
  .delete(
    "/wfh/check-ins/:date",
    docs("Clear own daily check-in"),
    validated("param", z.object({ date: wfhDateSchema })),
    async (c) => {
      await clearWfhCheckIn(c.get("wfhProfileId"), c.req.valid("param").date);
      return c.json({ success: true as const });
    },
  )
  .get(
    "/wfh/allowance",
    docs("Read annual allowance (default 45)"),
    validated("query", query),
    async (c) =>
      c.json({
        allowance: await getWfhAllowance(c.get("wfhProfileId"), c.req.valid("query").year),
      }),
  )
  .patch(
    "/wfh/allowance",
    docs("Update own annual quota"),
    validated("json", wfhAllowanceSchema),
    async (c) =>
      c.json({ allowance: await saveWfhAllowance(c.get("wfhProfileId"), c.req.valid("json")) }),
  )
  .get("/wfh/stats", docs("Read own annual WFH statistics"), validated("query", query), async (c) =>
    c.json({ stats: await getWfhStats(c.get("wfhProfileId"), c.req.valid("query").year) }),
  );
