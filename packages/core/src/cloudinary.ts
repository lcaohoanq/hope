import {
  MAX_OPTIMIZED_WORKOUT_IMAGE_BYTES,
  MAX_WORKOUT_IMAGE_DIMENSION,
  OPTIMIZED_WORKOUT_IMAGE_FORMATS,
  WorkoutImageValidationError,
} from "@hope/shared";

export type UploadedAsset = {
  publicId: string;
  secureUrl: string;
  format: string;
  width: number;
  height: number;
  sizeBytes: number;
};

export type WorkoutImageUploadParams = {
  allowed_formats: ["webp", "jpg"];
  overwrite: false;
  public_id: string;
  timestamp: number;
};

export type WorkoutImageUploadTicket = {
  params: WorkoutImageUploadParams;
  publicId: string;
  signature: string;
};

const CLOUDINARY_API_BASE = "https://api.cloudinary.com/v1_1";
const CLOUDINARY_DELIVERY_BASE = "https://res.cloudinary.com";

type CloudinaryResource = {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  resource_type: string;
  type: string;
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

function serializeSignatureValue(value: unknown): string {
  return Array.isArray(value) ? value.join(",") : String(value);
}

async function signParams(params: Record<string, unknown>, apiSecret: string): Promise<string> {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${serializeSignatureValue(params[key])}`)
    .join("&");
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(toSign + apiSecret));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function basicAuthHeader(apiKey: string, apiSecret: string) {
  return `Basic ${btoa(`${apiKey}:${apiSecret}`)}`;
}

export async function createWorkoutImageUploadTickets(profileId: string, count: number) {
  const { apiKey, apiSecret, cloudName } = getCloudinaryCredentials();
  const timestamp = Math.floor(Date.now() / 1000);
  const uploads = await Promise.all(
    Array.from({ length: count }, async (): Promise<WorkoutImageUploadTicket> => {
      const publicId = `${getWorkoutImagePublicIdPrefix(profileId)}${crypto.randomUUID()}`;
      const params: WorkoutImageUploadParams = {
        allowed_formats: ["webp", "jpg"],
        overwrite: false,
        public_id: publicId,
        timestamp,
      };
      return {
        params,
        publicId,
        signature: await signParams(params, apiSecret),
      };
    }),
  );

  return {
    apiKey,
    uploadUrl: `${CLOUDINARY_API_BASE}/${encodeURIComponent(cloudName)}/image/upload`,
    uploads,
  };
}

async function getVerifiedCloudinaryWorkoutImageAssets(
  profileId: string,
  publicIds: string[],
): Promise<UploadedAsset[]> {
  const { apiKey, apiSecret, cloudName } = getCloudinaryCredentials();
  const url = new URL(
    `${CLOUDINARY_API_BASE}/${encodeURIComponent(cloudName)}/resources/image/upload`,
  );
  for (const publicId of publicIds) {
    url.searchParams.append("public_ids[]", publicId);
  }
  url.searchParams.set("max_results", String(publicIds.length));

  const response = await fetch(url, {
    headers: { Authorization: basicAuthHeader(apiKey, apiSecret) },
  });
  if (!response.ok) {
    throw new Error(`Cloudinary admin API returned ${response.status}.`);
  }

  const payload = (await response.json()) as { resources: CloudinaryResource[] };
  const resources = new Map(payload.resources.map((resource) => [resource.public_id, resource]));

  return publicIds.map((publicId) => {
    const resource = resources.get(publicId);

    if (!resource) {
      throw new WorkoutImageValidationError("One or more workout images were not found.");
    }

    if (
      resource.resource_type !== "image" ||
      resource.type !== "upload" ||
      !OPTIMIZED_WORKOUT_IMAGE_FORMATS.has(resource.format) ||
      resource.bytes > MAX_OPTIMIZED_WORKOUT_IMAGE_BYTES ||
      resource.width > MAX_WORKOUT_IMAGE_DIMENSION ||
      resource.height > MAX_WORKOUT_IMAGE_DIMENSION ||
      resource.width <= 0 ||
      resource.height <= 0 ||
      !resource.secure_url.startsWith("https://")
    ) {
      throw new WorkoutImageValidationError(
        "Workout images must be WebP or JPEG, no larger than 1600px or 1MB.",
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

async function getVerifiedStorageWorkoutImageAssets(publicIds: string[]): Promise<UploadedAsset[]> {
  const { getStorageAdapter } = await import("./storage/index");
  const adapter = getStorageAdapter();

  return Promise.all(
    publicIds.map(async (publicId) => {
      const stat = await adapter.stat(publicId);
      if (!stat) {
        throw new WorkoutImageValidationError("One or more workout images were not found.");
      }

      const format =
        stat.contentType.includes("jpeg") || stat.contentType.includes("jpg") ? "jpg" : "webp";

      return {
        publicId,
        secureUrl: adapter.getPublicUrl(publicId),
        format,
        width: stat.width ?? 0,
        height: stat.height ?? 0,
        sizeBytes: stat.sizeBytes,
      } satisfies UploadedAsset;
    }),
  );
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

  if ((process.env.STORAGE_PROVIDER ?? "cloudinary") === "minio") {
    return getVerifiedStorageWorkoutImageAssets(publicIds);
  }

  return getVerifiedCloudinaryWorkoutImageAssets(profileId, publicIds);
}

export async function uploadImageBuffer(
  bytes: ArrayBuffer | Uint8Array,
  publicId: string,
): Promise<UploadedAsset> {
  const { apiKey, apiSecret, cloudName } = getCloudinaryCredentials();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await signParams(
    { overwrite: true, public_id: publicId, timestamp },
    apiSecret,
  );

  const form = new FormData();
  form.append("file", new Blob([bytes as ArrayBuffer]));
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("public_id", publicId);
  form.append("overwrite", "true");
  form.append("signature", signature);

  const response = await fetch(
    `${CLOUDINARY_API_BASE}/${encodeURIComponent(cloudName)}/image/upload`,
    { method: "POST", body: form },
  );
  if (!response.ok) {
    throw new Error(`Cloudinary upload returned ${response.status}.`);
  }

  const resource = (await response.json()) as CloudinaryResource;
  return {
    publicId: resource.public_id,
    secureUrl: resource.secure_url,
    format: resource.format,
    width: resource.width,
    height: resource.height,
    sizeBytes: resource.bytes,
  };
}

export async function uploadAvatarImage(input: {
  bytes: ArrayBuffer | Uint8Array;
  publicId: string;
}): Promise<UploadedAsset> {
  const { cloudName } = getCloudinaryCredentials();
  const asset = await uploadImageBuffer(input.bytes, input.publicId);
  const transformation = "c_fill,g_auto,h_512,w_512,f_webp,q_86";
  const secureUrl = `${CLOUDINARY_DELIVERY_BASE}/${encodeURIComponent(cloudName)}/image/upload/${transformation}/${asset.publicId}`;

  return { ...asset, secureUrl, format: "webp", width: 512, height: 512 };
}

export async function deleteImage(publicId: string) {
  const { apiKey, apiSecret, cloudName } = getCloudinaryCredentials();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await signParams(
    { invalidate: true, public_id: publicId, timestamp },
    apiSecret,
  );

  const form = new FormData();
  form.append("public_id", publicId);
  form.append("invalidate", "true");
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);

  const response = await fetch(
    `${CLOUDINARY_API_BASE}/${encodeURIComponent(cloudName)}/image/destroy`,
    { method: "POST", body: form },
  );
  if (!response.ok) {
    throw new Error(`Cloudinary destroy returned ${response.status}.`);
  }
}

export async function cleanupUploadedAssets(publicIds: string[]) {
  return Promise.allSettled(publicIds.map(deleteImage));
}

export function getWorkoutImagePublicIdPrefix(profileId: string) {
  // MinIO Option B uses "workouts/"; Cloudinary signed uploads use "hope/workouts/".
  return process.env.STORAGE_PROVIDER === "minio"
    ? `workouts/${profileId}/`
    : `hope/workouts/${profileId}/`;
}

export function isOwnedWorkoutImagePublicId(profileId: string, publicId: string) {
  return (
    publicId.startsWith(`workouts/${profileId}/`) ||
    publicId.startsWith(`hope/workouts/${profileId}/`)
  );
}

export function getAvatarPublicId(profileId: string) {
  return process.env.STORAGE_PROVIDER === "minio"
    ? `avatars/${profileId}`
    : `hope/avatars/${profileId}`;
}
