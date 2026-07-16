import type { Context } from "hono";
import { validator } from "hono-openapi";
import type { ZodType } from "zod";

type ValidationTarget = "json" | "query" | "param" | "form";

/**
 * Zod validator that keeps the existing 400 `{ success: false, error }` shape
 * and registers request schemas with hono-openapi.
 */
export function validated<Target extends ValidationTarget, Schema extends ZodType>(
  target: Target,
  schema: Schema,
) {
  return validator(target, schema, (result, c: Context) => {
    if (!result.success) {
      return c.json(
        {
          success: false as const,
          error: result.error[0]?.message ?? "Validation failed.",
        },
        400,
      );
    }
  });
}
