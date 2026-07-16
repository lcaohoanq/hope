import { prepareWorkoutImageUploads } from "@/lib/image-previews";
import { MAX_WORKOUT_IMAGES } from "@/lib/workout-images";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

type UploadResponse =
  | { success: true; assets: { key: string }[] }
  | { success: false; error: string };

export async function uploadWorkoutImagesDirectly(
  images: File[],
  token?: string | null,
): Promise<string[]> {
  if (images.length === 0) return [];
  if (images.length > MAX_WORKOUT_IMAGES) {
    throw new Error(`Please upload no more than ${MAX_WORKOUT_IMAGES} images per workout.`);
  }

  const optimized = await prepareWorkoutImageUploads(images);
  const formData = new FormData();
  for (const file of optimized) {
    formData.append("files", file);
  }

  const res = await fetch(`${API_URL}/workout-images/upload`, {
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
    await fetch(`${API_URL}/workout-images`, {
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
