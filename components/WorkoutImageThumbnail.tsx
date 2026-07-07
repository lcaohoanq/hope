"use client";

import { useState } from "react";
import type { WorkoutImage } from "@/lib/workout-types";

type WorkoutImageThumbnailProps = {
  image: WorkoutImage;
  workoutDate: string;
};

export function WorkoutImageThumbnail({
  image,
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
      <div className="flex h-full w-full items-center justify-center bg-stone-100 px-1 text-center text-[9px] leading-tight text-stone-500">
        Image unavailable
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={`Workout image for ${workoutDate}`}
      className="h-full w-full object-cover"
      height={image.height}
      loading="lazy"
      onError={handleImageError}
      src={src}
      width={image.width}
    />
  );
}
