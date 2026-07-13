"use client";

import { useState } from "react";
import Image from "next/image";

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
  const renderedSrc =
    failedSrc === src && src.startsWith("/uploads/avatars/") ? `/api${src}` : src;

  if (src.startsWith("blob:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
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
      unoptimized={renderedSrc.startsWith("/api/uploads/avatars/")}
    />
  );
}
