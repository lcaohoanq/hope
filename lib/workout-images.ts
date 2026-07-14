import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { WorkoutImage } from "@/lib/workout-types";

export const MAX_WORKOUT_IMAGES = 3;
export const MAX_WORKOUT_IMAGE_BYTES = 10 * 1024 * 1024;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WORKOUT_IMAGE_SRC_PATTERN =
  /^\/uploads\/(\d{4})\/(\d{2})\/(\d{4}-\d{2}-\d{2}-workout-[a-z0-9-]+\.avif)$/;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

type AppwriteImageResponse = {
  success?: unknown;
  error?: unknown;
  message?: unknown;
  details?: unknown;
  filename?: unknown;
  mimeType?: unknown;
  outputBase64?: unknown;
  sizeBytes?: unknown;
  width?: unknown;
  height?: unknown;
};

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
    throw new WorkoutImageValidationError("Each workout image must be 10MB or smaller.");
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
    ? (workoutDate ?? "")
    : new Date().toISOString().slice(0, 10);
  const convertedImage = await convertWorkoutImageWithAppwrite({
    buffer,
    workoutDate: dateKey,
    originalMimeType,
  });
  const filename = normalizeOptimizedImageFilename(convertedImage.filename, dateKey);
  const year = filename.slice(0, 4);
  const month = filename.slice(5, 7);
  const localPath = path.join(process.cwd(), "public", "uploads", year, month, filename);
  const repositoryPath = `public/uploads/${year}/${month}/${filename}`;
  const src = `/uploads/${year}/${month}/${filename}`;
  const optimizedBuffer = Buffer.from(convertedImage.outputBase64, "base64");

  return {
    src,
    format: "avif",
    width: convertedImage.width,
    height: convertedImage.height,
    sizeBytes: convertedImage.sizeBytes,
    buffer: optimizedBuffer,
    localPath,
    repositoryPath,
  };
}

export function getWorkoutImageMetadata(image: OptimizedWorkoutImage): WorkoutImage {
  return {
    src: image.src,
    format: image.format,
    width: image.width,
    height: image.height,
    sizeBytes: image.sizeBytes,
  };
}

export async function writeOptimizedWorkoutImagesLocally(images: OptimizedWorkoutImage[]) {
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

export async function cleanupOptimizedWorkoutImagesLocally(images: OptimizedWorkoutImage[]) {
  await cleanupLocalPaths(images.map((image) => image.localPath));
}

export async function deleteWorkoutImagesLocally(images: WorkoutImage[]) {
  await cleanupLocalPaths(images.map((image) => getWorkoutImageLocalPath(image)));
}

export function getWorkoutImageRepositoryPath(image: WorkoutImage) {
  const safePath = getWorkoutImageSafePath(image);

  return `public/uploads/${safePath.year}/${safePath.month}/${safePath.filename}`;
}

function getWorkoutImageLocalPath(image: WorkoutImage) {
  const safePath = getWorkoutImageSafePath(image);

  return path.join(
    process.cwd(),
    "public",
    "uploads",
    safePath.year,
    safePath.month,
    safePath.filename,
  );
}

function getWorkoutImageSafePath(image: WorkoutImage) {
  const match = image.src.match(WORKOUT_IMAGE_SRC_PATTERN);

  if (!match) {
    throw new WorkoutImageValidationError("Workout image path is invalid.");
  }

  return {
    year: match[1],
    month: match[2],
    filename: match[3],
  };
}

async function cleanupLocalPaths(paths: string[]) {
  await Promise.all(
    paths.map(async (filePath) => {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT") {
          throw error;
        }
      }
    }),
  );
}

async function convertWorkoutImageWithAppwrite({
  buffer,
  workoutDate,
  originalMimeType,
}: {
  buffer: Buffer;
  workoutDate: string;
  originalMimeType?: string;
}) {
  const imageProcessorUrl = getAppwriteImageProcessorUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (process.env.APPWRITE_IMAGE_PROCESSOR_KEY) {
    headers["X-Appwrite-Key"] = process.env.APPWRITE_IMAGE_PROCESSOR_KEY;
  }

  let response: Response;

  try {
    response = await fetch(imageProcessorUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        imageBase64: buffer.toString("base64"),
        mimeType: originalMimeType,
        workoutDate,
      }),
    });
  } catch {
    throw new WorkoutImageValidationError("Unable to reach the image processing service.");
  }

  let payload: AppwriteImageResponse;

  try {
    payload = (await response.json()) as AppwriteImageResponse;
  } catch {
    throw new WorkoutImageValidationError(
      "The image processing service returned an invalid response.",
    );
  }

  if (!response.ok || payload.error || payload.success === false) {
    const message =
      typeof payload.details === "string"
        ? payload.details
        : typeof payload.message === "string"
          ? payload.message
          : "Unable to process this image.";

    throw new WorkoutImageValidationError(message);
  }

  return normalizeAppwriteImageResponse(payload);
}

function getAppwriteImageProcessorUrl() {
  const url =
    process.env.APPWRITE_IMAGE_PROCESSOR_URL || process.env.APPWRITE_PROCESS_IMAGE_FUNCTION_URL;

  if (!url) {
    throw new WorkoutImageValidationError("Image processing service is not configured.");
  }

  return url;
}

function normalizeAppwriteImageResponse(payload: AppwriteImageResponse) {
  if (
    typeof payload.outputBase64 !== "string" ||
    !payload.outputBase64 ||
    typeof payload.width !== "number" ||
    typeof payload.height !== "number" ||
    typeof payload.sizeBytes !== "number"
  ) {
    throw new WorkoutImageValidationError(
      "The image processing service returned incomplete image data.",
    );
  }

  if (payload.mimeType && payload.mimeType !== "image/avif") {
    throw new WorkoutImageValidationError(
      "The image processing service did not return an AVIF image.",
    );
  }

  return {
    filename: typeof payload.filename === "string" ? payload.filename : null,
    outputBase64: payload.outputBase64,
    width: payload.width,
    height: payload.height,
    sizeBytes: payload.sizeBytes,
  };
}

function normalizeOptimizedImageFilename(filename: string | null, dateKey: string) {
  if (filename && new RegExp(`^${dateKey}-workout-[a-z0-9-]+\\.avif$`).test(filename)) {
    return filename;
  }

  return `${dateKey}-workout-${randomUUID().slice(0, 8)}.avif`;
}
