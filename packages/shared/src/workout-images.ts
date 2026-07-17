/** Max images attached to a single workout. */
export const MAX_WORKOUT_IMAGES = 3;
/** Max size of an uploaded workout image in bytes (10 MB). */
export const MAX_WORKOUT_IMAGE_BYTES = 10 * 1024 * 1024;
/** Max size after client/server optimization (1 MB). */
export const MAX_OPTIMIZED_WORKOUT_IMAGE_BYTES = 1024 * 1024;
/** Max width/height for optimized workout images. */
export const MAX_WORKOUT_IMAGE_DIMENSION = 1600;

/** MIME types accepted for workout image uploads. */
export const ALLOWED_WORKOUT_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/** MIME types produced after optimization. */
export const OPTIMIZED_WORKOUT_IMAGE_MIME_TYPES = new Set(["image/webp", "image/jpeg"]);
/** File format labels for optimized images. */
export const OPTIMIZED_WORKOUT_IMAGE_FORMATS = new Set(["webp", "jpg"]);

/** Thrown when a workout image fails client-side validation. */
export class WorkoutImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkoutImageValidationError";
  }
}

/**
 * Validate a workout image file before upload.
 *
 * @param file - Browser `File` to check.
 * @throws {@link WorkoutImageValidationError} when type or size is invalid.
 */
export function validateWorkoutImageUpload(file: File) {
  const normalizedName = file.name.toLowerCase();
  const hasAllowedExtension = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"].some(
    (extension) => normalizedName.endsWith(extension),
  );

  if (!ALLOWED_WORKOUT_IMAGE_MIME_TYPES.has(file.type) && !hasAllowedExtension) {
    throw new WorkoutImageValidationError(
      "Please upload JPG, PNG, WebP, HEIC, or HEIF images only.",
    );
  }

  if (file.size > MAX_WORKOUT_IMAGE_BYTES) {
    throw new WorkoutImageValidationError("Each workout image must be 10MB or smaller.");
  }
}
