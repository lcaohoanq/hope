/** Maximum avatar upload size in bytes (5 MB). */
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
/** Allowed avatar MIME types. */
export const AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Client-side avatar validation failure reason. */
export type AvatarValidationError = "invalid-type" | "too-large";

/**
 * Validate an avatar file's type and size.
 *
 * @param file - File-like object with `size` and `type`.
 * @returns Error code, or `null` when valid.
 */
export function validateAvatarFile(file: Pick<File, "size" | "type">) {
  if (!AVATAR_MIME_TYPES.has(file.type)) {
    return "invalid-type" satisfies AvatarValidationError;
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return "too-large" satisfies AvatarValidationError;
  }

  return null;
}
