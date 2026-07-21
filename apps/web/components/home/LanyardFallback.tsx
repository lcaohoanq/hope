import Image from "next/image";

type LanyardFallbackProps = {
  className?: string;
  image?: string | null;
};

export function LanyardFallback({ className = "", image = null }: LanyardFallbackProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none h-full min-h-[460px] w-full overflow-hidden ${className}`}
    >
      <div className="relative h-full w-full">
        <div className="absolute bottom-[calc(50%_+_8rem)] right-[18%] top-0 w-px bg-gradient-to-b from-transparent via-accent/30 to-accent/65 sm:right-[20%] lg:right-[22%]" />
        <div className="absolute right-[calc(18%_-_0.3rem)] top-[calc(50%_-_8.4rem)] h-3 w-3 rounded-full border border-accent/35 bg-panel shadow-[0_0_0_5px_oklch(var(--color-accent)/0.08)] sm:right-[calc(20%_-_0.3rem)] lg:right-[calc(22%_-_0.3rem)]" />
        <div className="absolute right-[max(4%,calc(18%_-_6.5rem))] top-1/2 aspect-[0.71] w-[13rem] -translate-y-1/2 overflow-hidden rounded-[1.15rem] border border-border/80 bg-panel shadow-panel sm:right-[max(6%,calc(20%_-_7rem))] sm:w-[14rem] lg:right-[max(8%,calc(22%_-_7.5rem))] lg:w-[15rem]">
          {image ? (
            <Image
              alt=""
              className="object-cover opacity-75 saturate-[0.85]"
              fill
              priority
              sizes="(max-width: 640px) 13rem, (max-width: 1024px) 14rem, 15rem"
              src={image}
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-overlay/15" />
          <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-panel/20 to-transparent" />
        </div>
      </div>
    </div>
  );
}
