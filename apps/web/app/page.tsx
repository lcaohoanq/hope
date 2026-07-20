import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FaArrowRight, FaChartLine, FaDumbbell, FaLeaf } from "react-icons/fa";
import BlurText from "@/components/home/BlurText";
import { FocusableSplineScene } from "@/components/home/FocusableSplineScene";
import { HeroSplineScene } from "@/components/home/HeroSplineScene";
import { HomeGallery } from "@/components/home/HomeGallery";
import { HomeScroll } from "@/components/home/HomeScroll";
import { ScrollToHomeSection } from "@/components/home/ScrollToHomeSection";
import TextType from "@/components/home/TextType";
import { getServerApiClient } from "@/lib/api";

const SCENE_URL = "https://prod.spline.design/XLUYGWRp91S4SqN2/scene.splinecode";

const features = [
  {
    title: "Capture what happened",
    description: "Keep time, exercises, notes, and progress together after every session.",
    icon: FaDumbbell,
  },
  {
    title: "Read the pattern",
    description: "Turn scattered workouts into a rhythm you can understand at a glance.",
    icon: FaChartLine,
  },
  {
    title: "Return without pressure",
    description: "Missed days stay in the record, so starting again feels natural.",
    icon: FaLeaf,
  },
];

export const metadata = {
  title: "Hope - Make consistency visible",
  description:
    "A calm workout journal for logging movement, seeing your rhythm, and beginning the next session.",
};

function GalleryFallback() {
  return <div aria-hidden="true" className="min-h-dvh bg-panel/[0.36]" />;
}

export default async function Home() {
  const client = await getServerApiClient();
  const res = await client.users.me.$get();
  const me = (await res.json()) as { status: string; user: { username: string } | null };

  if (me.status === "ready" && me.user) {
    redirect(`/@${me.user.username}`);
  }
  if (me.status !== "signed-out") {
    redirect("/auth/continue");
  }

  const primaryHref = "/login";
  const primaryLabel = "Start your journal";

  return (
    <HomeScroll
      gallery={
        <Suspense fallback={<GalleryFallback />}>
          <HomeGallery />
        </Suspense>
      }
      hero={
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[52rem]"
            style={{
              background:
                "radial-gradient(circle at 15% 8%, oklch(var(--color-accent) / 0.13), transparent 32%), radial-gradient(circle at 76% 12%, oklch(var(--color-panel-muted) / 0.72), transparent 34%)",
            }}
          />

          <div className="relative mx-auto flex min-h-dvh max-w-[1440px] flex-col px-4 sm:px-6 lg:px-8">
            <header className="flex h-20 shrink-0 items-center justify-between gap-4">
              <Link
                className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-[-0.02em] text-text"
                href="/"
              >
                <Image
                  alt=""
                  aria-hidden="true"
                  className="h-6 w-6 shrink-0"
                  height={24}
                  src="/favicon.ico"
                  unoptimized
                  width={24}
                />
                Hope
              </Link>

              <Link
                className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full border border-border bg-panel/80 px-4 text-sm font-semibold text-text backdrop-blur transition duration-300 hover:border-accent/45 hover:text-accent active:scale-[0.98]"
                href={primaryHref}
              >
                {primaryLabel}
              </Link>
            </header>

            <div className="grid flex-1 items-center gap-9 pb-10 pt-5 md:pb-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(520px,1.18fr)] lg:gap-8 lg:pb-16 lg:pt-4">
              <div className="relative max-w-2xl lg:pr-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                  Your personal movement journal
                </p>
                <BlurText
                  as="h1"
                  text="Make consistency visible."
                  delay={150}
                  animateBy="words"
                  direction="top"
                  className="mt-5 text-5xl font-semibold leading-[0.96] tracking-[-0.055em] text-text sm:text-6xl lg:text-[4.75rem]"
                />
                <TextType
                  as="p"
                  text={[
                    "Log every workout, see your rhythm, and make the next session easier to begin.",
                    "Keep time, exercises, and notes together after every session.",
                    "Turn scattered workouts into a rhythm you can understand.",
                  ]}
                  typingSpeed={55}
                  deletingSpeed={28}
                  pauseDuration={1800}
                  showCursor
                  cursorCharacter="|"
                  className="mt-6 max-w-[33rem] text-base leading-7 text-muted sm:text-lg sm:leading-8"
                />

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    className="group inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-5 text-sm font-semibold text-accent-contrast transition duration-300 hover:brightness-95 active:scale-[0.98]"
                    href={primaryHref}
                  >
                    {primaryLabel}
                    <FaArrowRight
                      aria-hidden="true"
                      className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                    />
                  </Link>
                  <ScrollToHomeSection
                    className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full px-2 text-sm font-semibold text-text underline decoration-border underline-offset-8 transition duration-300 hover:text-accent hover:decoration-accent"
                    sectionId="joke"
                  >
                    Scroll for a joke
                  </ScrollToHomeSection>
                </div>
              </div>

              <FocusableSplineScene className="h-[52dvh] min-h-[390px] sm:h-[58dvh] lg:h-[min(72dvh,760px)] lg:min-h-[560px]">
                <HeroSplineScene scene={SCENE_URL} />
              </FocusableSplineScene>
            </div>
          </div>
        </>
      }
      features={
        <div className="relative border-t border-border bg-panel/[0.36]">
          <div className="mx-auto grid min-h-dvh max-w-[1440px] content-center gap-12 px-4 py-20 sm:px-6 md:py-24 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-20 lg:px-8 lg:py-28">
            <div className="max-w-lg">
              <h2 className="text-3xl font-semibold leading-tight tracking-[-0.04em] text-text sm:text-4xl">
                A record that helps you return.
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-muted">
                Hope keeps the signal clear, so progress feels useful instead of demanding.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3 md:gap-5">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <article className="group" key={feature.title}>
                    <div className="grid h-11 w-11 place-items-center rounded-full border border-border bg-panel text-accent transition duration-300 group-hover:-translate-y-0.5 group-hover:border-accent/45">
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    </div>
                    <h3 className="mt-5 text-base font-semibold text-text">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{feature.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      }
    />
  );
}
