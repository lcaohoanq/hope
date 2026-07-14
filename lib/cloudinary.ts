import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import {
  MAX_OPTIMIZED_WORKOUT_IMAGE_BYTES,
  MAX_WORKOUT_IMAGE_DIMENSION,
  WorkoutImageValidationError,
} from "@/lib/workout-images";

export type UploadedAsset = {
  publicId: string;
  secureUrl: string;
  format: string;
  width: number;
  height: number;
  sizeBytes: number;
};

export type WorkoutImageUploadParams = {
  allowed_formats: "webp";
  overwrite: false;
  public_id: string;
  timestamp: number;
};

export type WorkoutImageUploadTicket = {
  params: WorkoutImageUploadParams;
  publicId: string;
  signature: string;
};

function getCloudinaryCredentials() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary server credentials are not configured.");
  }

  return { apiKey, apiSecret, cloudName };
}

function configureCloudinary() {
  const { apiKey, apiSecret, cloudName } = getCloudinaryCredentials();

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return { apiKey, apiSecret, cloudName };
}

export function createWorkoutImageUploadTickets(profileId: string, count: number) {
  const { apiKey, apiSecret, cloudName } = configureCloudinary();
  const timestamp = Math.floor(Date.now() / 1000);
  const uploads = Array.from({ length: count }, (): WorkoutImageUploadTicket => {
    const publicId = `${getWorkoutImagePublicIdPrefix(profileId)}${randomUUID()}`;
    const params: WorkoutImageUploadParams = {
      allowed_formats: "webp",
      overwrite: false,
      public_id: publicId,
      timestamp,
    };

    return {
      params,
      publicId,
      signature: cloudinary.utils.api_sign_request(params, apiSecret),
    };
  });

  return {
    apiKey,
    uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
    uploads,
  };
}

export async function getVerifiedWorkoutImageAssets(
  profileId: string,
  publicIds: string[],
): Promise<UploadedAsset[]> {
  if (publicIds.length === 0) return [];

  if (new Set(publicIds).size !== publicIds.length) {
    throw new WorkoutImageValidationError("Workout image uploads must be unique.");
  }

  if (!publicIds.every((publicId) => isOwnedWorkoutImagePublicId(profileId, publicId))) {
    throw new WorkoutImageValidationError("One or more workout images are invalid.");
  }

  configureCloudinary();
  const response = await cloudinary.api.resources_by_ids(publicIds, {
    resource_type: "image",
    type: "upload",
  });
  const resources = new Map(response.resources.map((resource) => [resource.public_id, resource]));

  return publicIds.map((publicId) => {
    const resource = resources.get(publicId);

    if (!resource) {
      throw new WorkoutImageValidationError("One or more workout images were not found.");
    }

    if (
      resource.resource_type !== "image" ||
      resource.type !== "upload" ||
      resource.format !== "webp" ||
      resource.bytes > MAX_OPTIMIZED_WORKOUT_IMAGE_BYTES ||
      resource.width > MAX_WORKOUT_IMAGE_DIMENSION ||
      resource.height > MAX_WORKOUT_IMAGE_DIMENSION ||
      resource.width <= 0 ||
      resource.height <= 0 ||
      !resource.secure_url.startsWith("https://")
    ) {
      throw new WorkoutImageValidationError(
        "Workout images must be WebP, no larger than 1600px or 1MB.",
      );
    }

    return {
      publicId: resource.public_id,
      secureUrl: resource.secure_url,
      format: resource.format,
      width: resource.width,
      height: resource.height,
      sizeBytes: resource.bytes,
    };
  });
}

export async function uploadImageBuffer(buffer: Buffer, publicId: string): Promise<UploadedAsset> {
  configureCloudinary();
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      { public_id: publicId, overwrite: true, resource_type: "image" },
      (error, result) => {
        if (error || !result)
          return reject(error ?? new Error("Cloudinary upload returned no result."));
        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          format: result.format,
          width: result.width,
          height: result.height,
          sizeBytes: result.bytes,
        });
      },
    );
    upload.end(buffer);
  });
}

export async function deleteImage(publicId: string) {
  configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: "image" });
}

export async function cleanupUploadedAssets(publicIds: string[]) {
  return Promise.allSettled(publicIds.map(deleteImage));
}

export function getWorkoutImagePublicIdPrefix(profileId: string) {
  return `hope/workouts/${profileId}/`;
}

export function isOwnedWorkoutImagePublicId(profileId: string, publicId: string) {
  return publicId.startsWith(getWorkoutImagePublicIdPrefix(profileId));
}

export function getAvatarPublicId(profileId: string) {
  return `hope/avatars/${profileId}`;
}
