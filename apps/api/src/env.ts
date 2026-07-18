export type Bindings = {
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY?: string;
  CLERK_WEBHOOK_SIGNING_SECRET?: string;
  DATABASE_URL?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  ALLOWED_ORIGINS?: string;
  HYPERDRIVE?: Hyperdrive;
  STORAGE_PROVIDER?: string;
  MINIO_ENDPOINT?: string;
  MINIO_ACCESS_KEY?: string;
  MINIO_SECRET_KEY?: string;
  MINIO_BUCKET?: string;
  STORAGE_PUBLIC_URL?: string;
  /** Featured homepage gallery profile username (preferred over email). */
  FEATURED_GALLERY_USERNAME?: string;
  /** Featured homepage gallery profile email (Clerk lookup). Defaults to hoangclw@gmail.com. */
  FEATURED_GALLERY_EMAIL?: string;
};

export type AppEnv = {
  Bindings: Bindings;
};
