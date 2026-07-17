import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type {
  ImageTransform,
  StorageAdapter,
  StorageObjectStat,
  StorageStream,
  StoredFile,
} from "./types";

export interface MinioStorageConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  publicUrl: string;
}

export class MinioStorageAdapter implements StorageAdapter {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(config: MinioStorageConfig) {
    this.bucket = config.bucket;
    this.publicUrl = config.publicUrl.replace(/\/+$/, "");
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: "us-east-1",
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      forcePathStyle: true,
    });
  }

  async upload(input: { key: string; data: Uint8Array; contentType: string }): Promise<StoredFile> {
    let width: number | undefined;
    let height: number | undefined;

    if (input.contentType.startsWith("image/")) {
      try {
        const sharp = (await import("sharp")).default;
        const meta = await sharp(input.data).metadata();
        width = meta.width;
        height = meta.height;
      } catch {
        // Best-effort metadata; upload still proceeds.
      }
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.data,
        ContentType: input.contentType,
        Metadata: {
          ...(width != null ? { width: String(width) } : {}),
          ...(height != null ? { height: String(height) } : {}),
        },
      }),
    );

    return {
      key: input.key,
      url: this.getPublicUrl(input.key),
      contentType: input.contentType,
      width,
      height,
      sizeBytes: input.data.byteLength,
    };
  }

  async uploadWithTransform(input: {
    key: string;
    data: Uint8Array;
    contentType: string;
    transform: ImageTransform;
  }): Promise<StoredFile> {
    const sharp = (await import("sharp")).default;

    const format = input.transform.format ?? "webp";
    const quality = input.transform.quality ?? 80;

    let pipeline = sharp(input.data).resize(input.transform.width, input.transform.height, {
      fit: input.transform.fit,
    });

    if (format === "webp") {
      pipeline = pipeline.webp({ quality });
    } else {
      pipeline = pipeline.jpeg({ quality });
    }

    const transformed = await pipeline.toBuffer({ resolveWithObject: true });
    const outputContentType = format === "webp" ? "image/webp" : "image/jpeg";

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: transformed.data,
        ContentType: outputContentType,
        Metadata: {
          width: String(transformed.info.width),
          height: String(transformed.info.height),
        },
      }),
    );

    return {
      key: input.key,
      url: this.getPublicUrl(input.key),
      contentType: outputContentType,
      width: transformed.info.width,
      height: transformed.info.height,
      sizeBytes: transformed.info.size,
    };
  }

  async getObject(key: string): Promise<StorageStream | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!result.Body) return null;

      return {
        body: result.Body.transformToWebStream(),
        contentType: result.ContentType ?? "application/octet-stream",
        size: result.ContentLength,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "NoSuchKey") return null;
      throw error;
    }
  }

  async stat(key: string): Promise<StorageObjectStat | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const width = result.Metadata?.width ? Number(result.Metadata.width) : undefined;
      const height = result.Metadata?.height ? Number(result.Metadata.height) : undefined;
      return {
        contentType: result.ContentType ?? "application/octet-stream",
        sizeBytes: result.ContentLength ?? 0,
        width: Number.isFinite(width) ? width : undefined,
        height: Number.isFinite(height) ? height : undefined,
      };
    } catch {
      return null;
    }
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    return (await this.stat(key)) != null;
  }
}
