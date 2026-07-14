import {
  MAX_OPTIMIZED_WORKOUT_IMAGE_BYTES,
  MAX_WORKOUT_IMAGE_DIMENSION,
  validateWorkoutImageUpload,
} from "@/lib/workout-images";

export async function createImagePreviewUrls(images: File[]) {
  const previewUrls: string[] = [];

  try {
    for (const image of images) {
      const previewBlob = isHeicImage(image) ? await convertHeicImageForPreview(image) : image;

      previewUrls.push(URL.createObjectURL(previewBlob));
    }
  } catch (error) {
    revokeImagePreviewUrls(previewUrls);
    throw error;
  }

  return previewUrls;
}

export function revokeImagePreviewUrls(previewUrls: string[]) {
  previewUrls.forEach((url) => {
    URL.revokeObjectURL(url);
  });
}

function isHeicImage(image: File) {
  const mimeType = image.type.toLowerCase();
  const fileName = image.name.toLowerCase();

  return (
    mimeType === "image/heic" ||
    mimeType === "image/heif" ||
    fileName.endsWith(".heic") ||
    fileName.endsWith(".heif")
  );
}

async function convertHeicImageForPreview(image: File) {
  const { default: heic2any } = await import("heic2any");
  const convertedImage = await heic2any({
    blob: image,
    quality: 0.9,
    toType: "image/jpeg",
  });

  return Array.isArray(convertedImage) ? convertedImage[0] : convertedImage;
}

const WORKOUT_UPLOAD_INITIAL_QUALITY = 0.82;
const WORKOUT_UPLOAD_MIN_QUALITY = 0.56;
const WORKOUT_UPLOAD_QUALITY_STEP = 0.06;
const WORKOUT_UPLOAD_DIMENSION_SCALE = 0.82;
const WORKOUT_UPLOAD_MIN_DIMENSION = 640;
const WORKOUT_WEBP_MIME_TYPE = "image/webp";
const WORKOUT_JPEG_MIME_TYPE = "image/jpeg";

type OptimizedWorkoutImageMimeType = typeof WORKOUT_WEBP_MIME_TYPE | typeof WORKOUT_JPEG_MIME_TYPE;

let workoutUploadMimeTypePromise: Promise<OptimizedWorkoutImageMimeType> | undefined;

export async function prepareWorkoutImageUploads(images: File[]) {
  const optimizedImages: File[] = [];

  for (const image of images) {
    optimizedImages.push(await prepareWorkoutImageUpload(image));
  }

  return optimizedImages;
}

async function prepareWorkoutImageUpload(image: File) {
  validateWorkoutImageUpload(image);
  const previewableBlob = isHeicImage(image) ? await convertHeicImageForPreview(image) : image;
  const bitmap = await createImageBitmap(previewableBlob);

  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to prepare this workout image.");
    }

    const outputMimeType = await getWorkoutUploadMimeType();
    let dimensions = getResizedDimensions(bitmap.width, bitmap.height);

    while (true) {
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      if (outputMimeType === WORKOUT_JPEG_MIME_TYPE) {
        context.fillStyle = "#fff";
        context.fillRect(0, 0, dimensions.width, dimensions.height);
      }

      context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);

      let quality = WORKOUT_UPLOAD_INITIAL_QUALITY;

      while (true) {
        const optimizedBlob = await createCanvasBlob(canvas, outputMimeType, quality);

        if (optimizedBlob.size <= MAX_OPTIMIZED_WORKOUT_IMAGE_BYTES) {
          return new File(
            [optimizedBlob],
            getOptimizedWorkoutImageName(image.name, outputMimeType),
            { type: outputMimeType },
          );
        }

        if (quality <= WORKOUT_UPLOAD_MIN_QUALITY) {
          break;
        }

        quality = Math.max(
          WORKOUT_UPLOAD_MIN_QUALITY,
          Number((quality - WORKOUT_UPLOAD_QUALITY_STEP).toFixed(2)),
        );
      }

      const longestEdge = Math.max(dimensions.width, dimensions.height);

      if (longestEdge <= WORKOUT_UPLOAD_MIN_DIMENSION) {
        break;
      }

      dimensions = scaleDimensions(dimensions.width, dimensions.height);
    }

    throw new Error("Unable to reduce this workout image below 1MB.");
  } finally {
    bitmap.close();
  }
}

function getResizedDimensions(width: number, height: number) {
  const scale = Math.min(1, MAX_WORKOUT_IMAGE_DIMENSION / Math.max(width, height));

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function scaleDimensions(width: number, height: number) {
  const longestEdge = Math.max(width, height);
  const nextLongestEdge = Math.max(
    WORKOUT_UPLOAD_MIN_DIMENSION,
    Math.round(longestEdge * WORKOUT_UPLOAD_DIMENSION_SCALE),
  );
  const scale = nextLongestEdge / longestEdge;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function getWorkoutUploadMimeType() {
  workoutUploadMimeTypePromise ??= detectWorkoutUploadMimeType();
  return workoutUploadMimeTypePromise;
}

function detectWorkoutUploadMimeType(): Promise<OptimizedWorkoutImageMimeType> {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;

  return new Promise((resolve) => {
    try {
      canvas.toBlob(
        (blob) => {
          resolve(
            blob?.type === WORKOUT_WEBP_MIME_TYPE ? WORKOUT_WEBP_MIME_TYPE : WORKOUT_JPEG_MIME_TYPE,
          );
        },
        WORKOUT_WEBP_MIME_TYPE,
        WORKOUT_UPLOAD_INITIAL_QUALITY,
      );
    } catch {
      resolve(WORKOUT_JPEG_MIME_TYPE);
    }
  });
}

function createCanvasBlob(
  canvas: HTMLCanvasElement,
  mimeType: OptimizedWorkoutImageMimeType,
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.type !== mimeType) {
          reject(new Error("Unable to prepare this workout image."));
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

function getOptimizedWorkoutImageName(fileName: string, mimeType: OptimizedWorkoutImageMimeType) {
  const safeName = fileName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-]+/gi, "-");
  const normalizedName = safeName.replace(/-+/g, "-").replace(/^-|-$/g, "");
  const extension = mimeType === WORKOUT_WEBP_MIME_TYPE ? "webp" : "jpg";

  return `${normalizedName || "workout-image"}.${extension}`;
}
