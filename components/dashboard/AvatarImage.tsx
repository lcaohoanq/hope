"use client";

import Image from "next/image";
import { useState } from "react";

type AvatarImageProps = {
  alt: string;
  className: string;
  onLoad?: () => void;
  priority?: boolean;
  sizes: string;
  src: string;
};

export function AvatarImage({
  alt,
  className,
  onLoad,
  priority = false,
  sizes,
  src,
}: AvatarImageProps) {
  const [failedSrc, setFailedSrc] = useState("");
  const renderedSrc = failedSrc === src && src.startsWith("/uploads/avatars/") ? `/api${src}` : src;
  const isDiceBearSvg = renderedSrc.startsWith("https://api.dicebear.com/10.x/notionists/svg");

  if (src.startsWith("blob:")) {
    return (
      // biome-ignore lint/performance/noImgElement: Blob URLs cannot be optimized by next/image.
      <img alt={alt} className={className} onLoad={onLoad} src={src} />
    );
  }

  return (
    <Image
      alt={alt}
      className={className}
      fill
      onError={() => {
        if (src.startsWith("/uploads/avatars/")) {
          setFailedSrc(src);
        }
      }}
      onLoad={onLoad}
      priority={priority}
      sizes={sizes}
      src={renderedSrc}
      unoptimized={isDiceBearSvg || renderedSrc.startsWith("/api/uploads/avatars/")}
    />
  );
}
