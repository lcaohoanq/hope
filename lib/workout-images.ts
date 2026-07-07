import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { WorkoutImage } from "@/lib/workout-types";

export const MAX_WORKOUT_IMAGES = 3;
export const MAX_WORKOUT_IMAGE_BYTES = 10 * 1024 * 1024;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export type OptimizedWorkoutImage = WorkoutImage & {
  buffer: Buffer;
  localPath: string;
  repositoryPath: string;
};

export class WorkoutImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkoutImageValidationError";
  }
}

export function validateWorkoutImageUpload(file: File) {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    throw new WorkoutImageValidationError(
      "Please upload JPG, PNG, WebP, HEIC, or HEIF images only.",
    );
  }

  if (file.size > MAX_WORKOUT_IMAGE_BYTES) {
    throw new WorkoutImageValidationError(
      "Each workout image must be 10MB or smaller.",
    );
  }
}

export async function optimizeWorkoutImage({
  buffer,
  workoutDate,
  originalMimeType,
}: {
  buffer: Buffer;
  workoutDate?: string;
  originalMimeType?: string;
}): Promise<OptimizedWorkoutImage> {
  if (originalMimeType && !ALLOWED_IMAGE_MIME_TYPES.has(originalMimeType)) {
    throw new WorkoutImageValidationError(
      "Please upload JPG, PNG, WebP, HEIC, or HEIF images only.",
    );
  }

  const dateKey = DATE_PATTERN.test(workoutDate ?? "")
    ? workoutDate ?? ""
    : new Date().toISOString().slice(0, 10);
  const year = dateKey.slice(0, 4);
  const month = dateKey.slice(5, 7);
  const filename = `${dateKey}-workout-${randomUUID().slice(0, 8)}.avif`;
  const localPath = path.join(
    process.cwd(),
    "public",
    "uploads",
    year,
    month,
    filename,
  );
  const repositoryPath = `public/uploads/${year}/${month}/${filename}`;
  const src = `/uploads/${year}/${month}/${filename}`;

  try {
    const output = await sharp(buffer)
      .rotate()
      .resize({
        width: 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .avif({
        quality: 52,
        effort: 6,
      })
      .toBuffer({ resolveWithObject: true });
    const outputMetadata = await sharp(output.data).metadata();

    if (!outputMetadata.width || !outputMetadata.height) {
      throw new Error("Unable to read optimized image dimensions.");
    }

    return {
      src,
      format: "avif",
      width: outputMetadata.width,
      height: outputMetadata.height,
      sizeBytes: output.data.byteLength,
      buffer: output.data,
      localPath,
      repositoryPath,
    };
  } catch {
    if (originalMimeType === "image/heic" || originalMimeType === "image/heif") {
      throw new WorkoutImageValidationError(
        "HEIC/HEIF images are not supported by this server. Please upload JPG, PNG, or WebP instead.",
      );
    }

    throw new WorkoutImageValidationError(
      "Unable to process this image. Please upload a valid JPG, PNG, or WebP image.",
    );
  }
}

export function getWorkoutImageMetadata(
  image: OptimizedWorkoutImage,
): WorkoutImage {
  return {
    src: image.src,
    format: image.format,
    width: image.width,
    height: image.height,
    sizeBytes: image.sizeBytes,
  };
}

export async function writeOptimizedWorkoutImagesLocally(
  images: OptimizedWorkoutImage[],
) {
  const writtenPaths: string[] = [];

  try {
    for (const image of images) {
      await fs.mkdir(path.dirname(image.localPath), { recursive: true });
      await fs.writeFile(image.localPath, image.buffer);
      writtenPaths.push(image.localPath);
    }
  } catch (error) {
    await cleanupLocalPaths(writtenPaths);
    throw error;
  }
}

export async function cleanupOptimizedWorkoutImagesLocally(
  images: OptimizedWorkoutImage[],
) {
  await cleanupLocalPaths(images.map((image) => image.localPath));
}

async function cleanupLocalPaths(paths: string[]) {
  await Promise.all(
    paths.map(async (filePath) => {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        if (
          !error ||
          typeof error !== "object" ||
          !("code" in error) ||
          error.code !== "ENOENT"
        ) {
          throw error;
        }
      }
    }),
  );
}
