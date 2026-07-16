import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import type { ZodSchema, z } from "zod";

type ValidationTarget = "json" | "query" | "param" | "form";

export function validated<Target extends ValidationTarget, Schema extends ZodSchema>(
  target: Target,
  schema: Schema,
) {
  return zValidator(target, schema, (result, c: Context) => {
    if (!result.success) {
      return c.json(
        { success: false as const, error: result.error.issues[0]?.message ?? "Validation failed." },
        400,
      );
    }
  });
}
