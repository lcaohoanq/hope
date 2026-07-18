import {
  MAX_OPTIMIZED_WORKOUT_IMAGE_BYTES,
  MAX_WORKOUT_IMAGE_DIMENSION,
  MAX_WORKOUT_IMAGES,
} from "@hope/shared";
import * as ImageManipulator from "expo-image-manipulator";
import { getApiUrl } from "@/lib/env";

export type PickedImage = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

type UploadResponse =
  | { success: true; assets: { key: string }[] }
  | { success: false; error: string };

async function optimizeImage(image: PickedImage) {
  const result = await ImageManipulator.manipulateAsync(
    image.uri,
    [{ resize: { width: MAX_WORKOUT_IMAGE_DIMENSION } }],
    {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );
  return {
    uri: result.uri,
    name: image.fileName?.replace(/\.\w+$/, ".jpg") ?? `workout-${Date.now()}.jpg`,
    type: "image/jpeg",
  };
}

export async function uploadWorkoutImages(
  images: PickedImage[],
  token?: string | null,
): Promise<string[]> {
  if (images.length === 0) return [];
  if (images.length > MAX_WORKOUT_IMAGES) {
    throw new Error(`Please upload no more than ${MAX_WORKOUT_IMAGES} images per workout.`);
  }

  const optimized = await Promise.all(images.map(optimizeImage));
  const formData = new FormData();
  for (const file of optimized) {
    // React Native FormData file shape
    formData.append("files", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
  }

  const res = await fetch(`${getApiUrl()}/workout-images/upload`, {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = (await res.json()) as UploadResponse;
  if (!res.ok || !data.success) {
    throw new Error(!data.success ? data.error : "Unable to upload workout images.");
  }
  return data.assets.map((asset) => asset.key);
}

export async function cleanupWorkoutImageUploads(publicIds: string[], token?: string | null) {
  if (publicIds.length === 0) return;
  try {
    await fetch(`${getApiUrl()}/workout-images`, {
      method: "DELETE",
      body: JSON.stringify({ publicIds }),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    // Best-effort cleanup
  }
}

export { MAX_OPTIMIZED_WORKOUT_IMAGE_BYTES, MAX_WORKOUT_IMAGES };
