import { prepareWorkoutImageUploads } from "@/lib/image-previews";
import { MAX_OPTIMIZED_WORKOUT_IMAGE_BYTES, MAX_WORKOUT_IMAGES } from "@/lib/workout-images";

type UploadTicket = {
  params: Record<string, boolean | number | string>;
  publicId: string;
  signature: string;
};

type SignUploadResponse =
  | {
      success: true;
      apiKey: string;
      uploadUrl: string;
      uploads: UploadTicket[];
    }
  | {
      success: false;
      error: string;
    };

type CloudinaryUploadResponse = {
  public_id?: unknown;
};

export async function uploadWorkoutImagesDirectly(images: File[]) {
  if (images.length === 0) return [];

  if (images.length > MAX_WORKOUT_IMAGES) {
    throw new Error(`Please upload no more than ${MAX_WORKOUT_IMAGES} images per workout.`);
  }

  const optimizedImages = await prepareWorkoutImageUploads(images);
  const signResponse = await fetch("/api/workout-images", {
    body: JSON.stringify({ count: optimizedImages.length }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const signed = (await readJson(signResponse)) as SignUploadResponse;

  if (!signResponse.ok || !signed.success) {
    throw new Error("error" in signed ? signed.error : "Unable to prepare workout image uploads.");
  }

  if (signed.uploads.length !== optimizedImages.length) {
    throw new Error("The server returned incomplete workout image upload tickets.");
  }

  const ticketPublicIds = signed.uploads.map((upload) => upload.publicId);

  try {
    for (const [index, image] of optimizedImages.entries()) {
      if (image.type !== "image/webp" || image.size > MAX_OPTIMIZED_WORKOUT_IMAGE_BYTES) {
        throw new Error("Unable to optimize this workout image for upload.");
      }

      await uploadImageToCloudinary(image, signed.uploads[index], signed.apiKey, signed.uploadUrl);
    }

    return ticketPublicIds;
  } catch (error) {
    await cleanupWorkoutImageUploads(ticketPublicIds);
    throw error;
  }
}

export async function cleanupWorkoutImageUploads(publicIds: string[]) {
  if (publicIds.length === 0) return;

  try {
    await fetch("/api/workout-images", {
      body: JSON.stringify({ publicIds }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });
  } catch {
    // Preserve the original upload or save error if best-effort cleanup cannot reach the server.
  }
}

async function uploadImageToCloudinary(
  image: File,
  ticket: UploadTicket,
  apiKey: string,
  uploadUrl: string,
) {
  const formData = new FormData();
  formData.set("file", image);
  formData.set("api_key", apiKey);
  formData.set("signature", ticket.signature);

  for (const [key, value] of Object.entries(ticket.params)) {
    formData.set(key, String(value));
  }

  const response = await fetch(uploadUrl, { body: formData, method: "POST" });
  const payload = (await readJson(response)) as CloudinaryUploadResponse;

  if (!response.ok || payload.public_id !== ticket.publicId) {
    throw new Error("Unable to upload one or more workout images.");
  }
}

async function readJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new Error("The image upload service returned an invalid response.");
  }
}
