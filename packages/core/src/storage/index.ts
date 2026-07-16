import { CloudinaryStorageAdapter } from "./cloudinary";
import { MinioStorageAdapter } from "./minio";
import type { StorageAdapter } from "./types";

export { CloudinaryStorageAdapter } from "./cloudinary";
export { MinioStorageAdapter, type MinioStorageConfig } from "./minio";
export type {
  ImageTransform,
  StorageAdapter,
  StorageObjectStat,
  StorageStream,
  StoredFile,
} from "./types";

let cachedAdapter: StorageAdapter | undefined;
let cachedProvider: string | undefined;

export type StorageEnv = {
  STORAGE_PROVIDER?: string;
  MINIO_ENDPOINT?: string;
  MINIO_ACCESS_KEY?: string;
  MINIO_SECRET_KEY?: string;
  MINIO_BUCKET?: string;
  STORAGE_PUBLIC_URL?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
};

/** Sync storage-related env into process.env (Workers Bindings → Node globals). */
export function configureStorageEnv(env: StorageEnv) {
  const keys = [
    "STORAGE_PROVIDER",
    "MINIO_ENDPOINT",
    "MINIO_ACCESS_KEY",
    "MINIO_SECRET_KEY",
    "MINIO_BUCKET",
    "STORAGE_PUBLIC_URL",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ] as const;

  for (const key of keys) {
    const value = env[key];
    if (value) process.env[key] = value;
  }

  const provider = process.env.STORAGE_PROVIDER ?? "cloudinary";
  if (cachedProvider && cachedProvider !== provider) {
    cachedAdapter = undefined;
  }
}

export function getStorageAdapter(): StorageAdapter {
  const provider = process.env.STORAGE_PROVIDER ?? "cloudinary";
  if (cachedAdapter && cachedProvider === provider) return cachedAdapter;

  switch (provider) {
    case "minio": {
      const endpoint = process.env.MINIO_ENDPOINT;
      const accessKey = process.env.MINIO_ACCESS_KEY;
      const secretKey = process.env.MINIO_SECRET_KEY;
      if (!endpoint || !accessKey || !secretKey) {
        throw new Error(
          "MinIO storage requires MINIO_ENDPOINT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY.",
        );
      }
      cachedAdapter = new MinioStorageAdapter({
        endpoint,
        accessKey,
        secretKey,
        bucket: process.env.MINIO_BUCKET ?? "hope",
        publicUrl: process.env.STORAGE_PUBLIC_URL ?? endpoint,
      });
      cachedProvider = provider;
      return cachedAdapter;
    }
    case "cloudinary":
      cachedAdapter = new CloudinaryStorageAdapter();
      cachedProvider = provider;
      return cachedAdapter;
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }
}
