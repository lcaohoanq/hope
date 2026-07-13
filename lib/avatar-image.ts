export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const AVATAR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type AvatarValidationError = "invalid-type" | "too-large";

export function validateAvatarFile(file: Pick<File, "size" | "type">) {
  if (!AVATAR_MIME_TYPES.has(file.type)) {
    return "invalid-type" satisfies AvatarValidationError;
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return "too-large" satisfies AvatarValidationError;
  }

  return null;
}
