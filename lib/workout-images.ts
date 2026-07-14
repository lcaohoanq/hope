export const MAX_WORKOUT_IMAGES = 3;
export const MAX_WORKOUT_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_OPTIMIZED_WORKOUT_IMAGE_BYTES = 1024 * 1024;
export const MAX_WORKOUT_IMAGE_DIMENSION = 1600;

export const ALLOWED_WORKOUT_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const OPTIMIZED_WORKOUT_IMAGE_MIME_TYPES = new Set(["image/webp", "image/jpeg"]);
export const OPTIMIZED_WORKOUT_IMAGE_FORMATS = new Set(["webp", "jpg"]);

export class WorkoutImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkoutImageValidationError";
  }
}

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
