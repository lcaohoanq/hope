import { v2 as cloudinary } from "cloudinary";

export type UploadedAsset = {
  publicId: string;
  secureUrl: string;
  format: string;
  width: number;
  height: number;
  sizeBytes: number;
};

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary server credentials are not configured.");
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
}

export async function uploadImageBuffer(buffer: Buffer, publicId: string): Promise<UploadedAsset> {
  configureCloudinary();
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      { public_id: publicId, overwrite: true, resource_type: "image" },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary upload returned no result."));
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
  await Promise.allSettled(publicIds.map(deleteImage));
}

export function getWorkoutImagePublicId(profileId: string, workoutId: string, position: number) {
  return `hope/workouts/${profileId}/${workoutId}/${position}`;
}

export function getAvatarPublicId(profileId: string) {
  return `hope/avatars/${profileId}`;
}
