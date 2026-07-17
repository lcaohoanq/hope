import { deleteImage, uploadAvatarImage, uploadImageBuffer } from "../cloudinary";
import type {
  ImageTransform,
  StorageAdapter,
  StorageObjectStat,
  StorageStream,
  StoredFile,
} from "./types";

const CLOUDINARY_DELIVERY_BASE = "https://res.cloudinary.com";

function getCloudName(): string {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  if (!name) throw new Error("CLOUDINARY_CLOUD_NAME is not configured.");
  return name;
}

export class CloudinaryStorageAdapter implements StorageAdapter {
  async upload(input: { key: string; data: Uint8Array; contentType: string }): Promise<StoredFile> {
    const asset = await uploadImageBuffer(input.data, input.key);

    return {
      key: asset.publicId,
      url: asset.secureUrl,
      contentType: `image/${asset.format}`,
      width: asset.width,
      height: asset.height,
      sizeBytes: asset.sizeBytes,
    };
  }

  async uploadWithTransform(input: {
    key: string;
    data: Uint8Array;
    contentType: string;
    transform: ImageTransform;
  }): Promise<StoredFile> {
    const asset = await uploadAvatarImage({ bytes: input.data, publicId: input.key });

    return {
      key: asset.publicId,
      url: asset.secureUrl,
      contentType: `image/${asset.format}`,
      width: asset.width,
      height: asset.height,
      sizeBytes: asset.sizeBytes,
    };
  }

  async getObject(_key: string): Promise<StorageStream | null> {
    // Cloudinary serves via CDN; proxy streaming is not used.
    return null;
  }

  async stat(_key: string): Promise<StorageObjectStat | null> {
    return null;
  }

  getPublicUrl(key: string): string {
    const cloudName = getCloudName();
    return `${CLOUDINARY_DELIVERY_BASE}/${encodeURIComponent(cloudName)}/image/upload/${key}`;
  }

  async delete(key: string): Promise<void> {
    await deleteImage(key);
  }

  async exists(_key: string): Promise<boolean> {
    return true;
  }
}
