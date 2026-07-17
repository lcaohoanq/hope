export interface StoredFile {
  key: string;
  url: string;
  contentType: string;
  width?: number;
  height?: number;
  sizeBytes: number;
}

export interface StorageStream {
  body: ReadableStream;
  contentType: string;
  size?: number;
}

export interface ImageTransform {
  width: number;
  height: number;
  fit: "cover" | "contain";
  format?: "webp" | "jpeg";
  quality?: number;
}

export interface StorageObjectStat {
  contentType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
}

export interface StorageAdapter {
  upload(input: { key: string; data: Uint8Array; contentType: string }): Promise<StoredFile>;

  uploadWithTransform(input: {
    key: string;
    data: Uint8Array;
    contentType: string;
    transform: ImageTransform;
  }): Promise<StoredFile>;

  getObject(key: string): Promise<StorageStream | null>;
  stat(key: string): Promise<StorageObjectStat | null>;
  getPublicUrl(key: string): string;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
