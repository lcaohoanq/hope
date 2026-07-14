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

const WORKOUT_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const WORKOUT_UPLOAD_MAX_DIMENSION = 1600;
const WORKOUT_UPLOAD_INITIAL_QUALITY = 0.82;
const WORKOUT_UPLOAD_MIN_QUALITY = 0.58;

export async function prepareWorkoutImageUploads(images: File[]) {
  const optimizedImages: File[] = [];

  for (const image of images) {
    optimizedImages.push(await prepareWorkoutImageUpload(image));
  }

  return optimizedImages;
}

async function prepareWorkoutImageUpload(image: File) {
  const previewableBlob = isHeicImage(image) ? await convertHeicImageForPreview(image) : image;

  if (previewableBlob.size <= WORKOUT_UPLOAD_MAX_BYTES && !isHeicImage(image)) {
    return image;
  }

  const bitmap = await createImageBitmap(previewableBlob);

  try {
    const { width, height } = getResizedDimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to prepare this workout image.");
    }

    context.drawImage(bitmap, 0, 0, width, height);

    let quality = WORKOUT_UPLOAD_INITIAL_QUALITY;
    let optimizedBlob = await createCanvasBlob(canvas, quality);

    while (optimizedBlob.size > WORKOUT_UPLOAD_MAX_BYTES && quality > WORKOUT_UPLOAD_MIN_QUALITY) {
      quality = Math.max(WORKOUT_UPLOAD_MIN_QUALITY, quality - 0.08);
      optimizedBlob = await createCanvasBlob(canvas, quality);
    }

    if (optimizedBlob.size > WORKOUT_UPLOAD_MAX_BYTES) {
      throw new Error("Please choose a smaller workout image.");
    }

    return new File([optimizedBlob], getOptimizedWorkoutImageName(image.name), {
      type: optimizedBlob.type,
    });
  } finally {
    bitmap.close();
  }
}

function getResizedDimensions(width: number, height: number) {
  const scale = Math.min(1, WORKOUT_UPLOAD_MAX_DIMENSION / Math.max(width, height));

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function createCanvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to prepare this workout image."));
          return;
        }

        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
}

function getOptimizedWorkoutImageName(fileName: string) {
  const safeName = fileName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-]+/gi, "-");
  const normalizedName = safeName.replace(/-+/g, "-").replace(/^-|-$/g, "");

  return `${normalizedName || "workout-image"}.webp`;
}
