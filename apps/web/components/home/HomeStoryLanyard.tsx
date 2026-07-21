"use client";

import dynamic from "next/dynamic";
import { LanyardFallback } from "@/components/home/LanyardFallback";
import { useHomeSectionInView } from "@/components/home/useHomeSectionInView";

const FRONT_IMAGE = "/home/hope-2026-06-27-other-photo-first.png";

const Lanyard = dynamic(
  () => import("@/components/home/Lanyard").then((module) => module.Lanyard),
  {
    loading: () => <LanyardFallback image={FRONT_IMAGE} />,
    ssr: false,
  },
);

export function HomeStoryLanyard() {
  const [sectionRef, isInView] = useHomeSectionInView<HTMLDivElement>();

  return (
    <div className="h-full min-h-[460px] w-full" ref={sectionRef}>
      {isInView ? (
        <Lanyard
          backImage="/icon-192.png"
          frontImage={FRONT_IMAGE}
          gravity={[0, 0, 0]}
          imageFit="cover"
          lanyardWidth={2}
          position={[0, 0, 18]}
        />
      ) : (
        <LanyardFallback image={FRONT_IMAGE} />
      )}
    </div>
  );
}
