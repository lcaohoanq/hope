import type { Area } from "react-easy-crop";

const AVATAR_OUTPUT_SIZE = 1024;

export async function createCroppedAvatarFile(imageUrl: string, crop: Area, originalName: string) {
  const image = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Your browser could not prepare the cropped image.");
  }

  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    AVATAR_OUTPUT_SIZE,
    AVATAR_OUTPUT_SIZE,
  );

  const blob = await canvasToBlob(canvas, "image/webp", 0.9);
  const baseName = originalName.replace(/\.[^.]+$/, "").trim() || "avatar";

  return new File([blob], `${baseName}-cropped.webp`, {
    type: blob.type,
    lastModified: Date.now(),
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected image could not be loaded."));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("The cropped image could not be created."));
        }
      },
      type,
      quality,
    );
  });
}
