import { z } from "zod";

const currentYear = new Date().getFullYear();

const requiredLocalizedTextSchema = z
  .object({
    en: z.string().trim().max(500, "English bio must be 500 characters or fewer."),
    vi: z.string().trim().max(500, "Vietnamese bio must be 500 characters or fewer."),
  })
  .strict();

const optionalLocalizedTextSchema = z
  .object({
    en: z.string().trim().max(50, "English pronouns must be 50 characters or fewer."),
    vi: z.string().trim().max(50, "Vietnamese pronouns must be 50 characters or fewer."),
  })
  .strict()
  .transform((value) => (value.en || value.vi ? value : undefined))
  .optional();

const optionalUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .max(2048, "URL must be 2048 characters or fewer.")
    .url("Enter a valid URL including http:// or https://.")
    .refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    }, "Only HTTP and HTTPS URLs are supported.")
    .optional(),
);

const socialLinksSchema = z
  .object({
    facebook: optionalUrlSchema,
    instagram: optionalUrlSchema,
    linkedin: optionalUrlSchema,
  })
  .strict()
  .transform((value) => (value.facebook || value.instagram || value.linkedin ? value : undefined))
  .optional();

export const profileUpdateSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "Display name must be at least 2 characters.")
      .max(80, "Display name must be 80 characters or fewer."),
    birthYear: z
      .number()
      .int("Birth year must be a whole number.")
      .min(1900, "Birth year must be 1900 or later.")
      .max(currentYear, `Birth year cannot be later than ${currentYear}.`),
    bio: requiredLocalizedTextSchema,
    pronouns: optionalLocalizedTextSchema,
    website: optionalUrlSchema,
    socialLinks: socialLinksSchema,
  })
  .strict();

export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>;
export type ValidatedProfileUpdate = z.output<typeof profileUpdateSchema>;

export function getProfileUpdateFieldErrors(error: z.ZodError) {
  return error.issues.reduce<Record<string, string>>((errors, issue) => {
    const field = issue.path.join(".");

    if (field && !errors[field]) {
      errors[field] = issue.message;
    }

    return errors;
  }, {});
}
