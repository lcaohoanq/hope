"use client";

import { type CSSProperties, useState } from "react";
import type { WorkoutImage } from "@/lib/workout-types";

type WorkoutImageThumbnailProps = {
  className?: string;
  image: WorkoutImage;
  imageClassName?: string;
  imageStyle?: CSSProperties;
  workoutDate: string;
};

export function WorkoutImageThumbnail({
  className = "h-full w-full",
  image,
  imageClassName = "h-full w-full object-cover",
  imageStyle,
  workoutDate,
}: WorkoutImageThumbnailProps) {
  const [src, setSrc] = useState(image.src);
  const [isUnavailable, setIsUnavailable] = useState(false);

  function handleImageError() {
    if (src === image.src && image.src.startsWith("/uploads/")) {
      setSrc(`/api${image.src}`);
      return;
    }

    setIsUnavailable(true);
  }

  if (isUnavailable) {
    return (
      <div
        className={`flex items-center justify-center bg-panel-muted px-1 text-center text-[9px] leading-tight text-muted ${className}`}
      >
        Image unavailable
      </div>
    );
  }

  return (
    // biome-ignore lint/performance/noImgElement: This component handles remote image fallback itself.
    <img
      alt={`Workout for ${workoutDate}`}
      className={imageClassName}
      height={image.height}
      loading="lazy"
      onError={handleImageError}
      src={src}
      style={imageStyle}
      width={image.width}
    />
  );
}
