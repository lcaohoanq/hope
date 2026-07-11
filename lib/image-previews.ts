export async function createImagePreviewUrls(images: File[]) {
  const previewUrls: string[] = [];

  try {
    for (const image of images) {
      const previewBlob = isHeicImage(image)
        ? await convertHeicImageForPreview(image)
        : image;

      previewUrls.push(URL.createObjectURL(previewBlob));
    }
  } catch (error) {
    revokeImagePreviewUrls(previewUrls);
    throw error;
  }

  return previewUrls;
}

export function revokeImagePreviewUrls(previewUrls: string[]) {
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
}

function isHeicImage(image: File) {
  const mimeType = image.type.toLowerCase();
  const fileName = image.name.toLowerCase();

  return (
    mimeType === "image/heic" ||
    mimeType === "image/heif" ||
    fileName.endsWith(".heic") ||
    fileName.endsWith(".heif")
  );
}

async function convertHeicImageForPreview(image: File) {
  const { default: heic2any } = await import("heic2any");
  const convertedImage = await heic2any({
    blob: image,
    quality: 0.9,
    toType: "image/jpeg",
  });

  return Array.isArray(convertedImage) ? convertedImage[0] : convertedImage;
}
