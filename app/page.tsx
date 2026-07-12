import { cookies } from "next/headers";
import Link from "next/link";
import {
  FaArrowRight,
  FaCalendarCheck,
  FaChartLine,
  FaDumbbell,
  FaLeaf,
} from "react-icons/fa";
import { AUTH_COOKIE_NAME, getAuthenticatedUser } from "@/lib/auth";
import { getCanonicalUserPath } from "@/lib/users";

const featureCards = [
  {
    title: "Log the real session",
    description:
      "Keep the small details that matter: time, exercises, notes, and the proof you showed up.",
    icon: FaDumbbell,
  },
  {
    title: "Read the rhythm",
    description:
      "A contribution-style heatmap makes consistency visible without turning training into noise.",
    icon: FaChartLine,
  },
  {
    title: "Return gently",
    description:
      "Missed days stay part of the record, so the next workout is easier to begin.",
    icon: FaLeaf,
  },
];

export const metadata = {
  title: "Hope - Workout consistency tracker",
  description:
    "A quiet workout journal for logging movement, seeing consistency, and returning to the next session.",
};

export default async function Home() {
  const cookieStore = await cookies();
  const authenticatedUser = getAuthenticatedUser(
    cookieStore.get(AUTH_COOKIE_NAME)?.value,
  );
  const primaryHref = authenticatedUser
    ? getCanonicalUserPath(authenticatedUser)
    : "/login";
  const primaryLabel = authenticatedUser ? "Open dashboard" : "Sign in";

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-paper text-stone-950">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(rgba(68,64,60,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(68,64,60,0.055) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(219,232,220,0.88),transparent_31%),radial-gradient(circle_at_82%_22%,rgba(254,243,199,0.48),transparent_28%),radial-gradient(circle_at_54%_78%,rgba(255,255,255,0.82),rgba(247,245,240,0.48)_42%,rgba(247,245,240,0.95)_78%)]"
      />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-[-0.01em] text-stone-950"
            href="/"
          >
            <span className="grid h-8 w-8 place-items-center rounded-md border border-stone-300 bg-white/78 text-moss shadow-[0_10px_30px_rgba(17,17,17,0.05)]">
              H
            </span>
            Hope
          </Link>

          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white/80 px-4 text-sm font-semibold text-stone-800 transition hover:border-moss/40 hover:text-moss active:scale-[0.98]"
            href={primaryHref}
          >
            {primaryLabel}
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1fr)] lg:py-20">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-md border border-stone-300 bg-white/72 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-moss">
              Personal movement journal
            </p>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.96] tracking-[-0.04em] text-stone-950 sm:text-6xl lg:text-7xl">
              Build a quieter record of showing up.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-stone-600 sm:text-lg">
              Hope turns workouts into a calm, visual habit record: log each
              session, review your heatmap, and keep the next day within reach.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-md bg-stone-950 px-5 text-sm font-semibold text-white transition hover:bg-stone-800 active:scale-[0.98]"
                href={primaryHref}
              >
                {primaryLabel}
                <FaArrowRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-center rounded-md border border-stone-300 bg-white/78 px-5 text-sm font-semibold text-stone-800 transition hover:border-moss/40 hover:text-moss active:scale-[0.98]"
                href="/login"
              >
                View login
              </Link>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-3 divide-x divide-stone-300 overflow-hidden rounded-lg border border-stone-300 bg-white/64 backdrop-blur">
              <div className="p-4">
                <p className="font-mono text-2xl font-semibold text-stone-950">
                  365
                </p>
                <p className="mt-1 text-xs leading-5 text-stone-500">
                  days in view
                </p>
              </div>
              <div className="p-4">
                <p className="font-mono text-2xl font-semibold text-stone-950">
                  4
                </p>
                <p className="mt-1 text-xs leading-5 text-stone-500">
                  focused fields
                </p>
              </div>
              <div className="p-4">
                <p className="font-mono text-2xl font-semibold text-stone-950">
                  1
                </p>
                <p className="mt-1 text-xs leading-5 text-stone-500">
                  steady ritual
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-4 rounded-[28px] bg-white/28 blur-2xl"
            />
            <div className="relative rounded-lg border border-stone-300 bg-white/86 p-4 shadow-[0_28px_100px_rgba(17,17,17,0.09)] backdrop-blur sm:p-5">
              <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-moss">
                    This week
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-stone-950">
                    Movement log
                  </h2>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-md bg-[#edf3ec] text-moss">
                  <FaCalendarCheck aria-hidden="true" className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {[
                  ["Mon", "Run", "32 min", "bg-moss"],
                  ["Tue", "Strength", "48 min", "bg-[#84a98c]"],
                  ["Wed", "Mobility", "18 min", "bg-[#b7c8ae]"],
                  ["Thu", "Rest", "Logged", "bg-stone-300"],
                ].map(([day, label, value, color]) => (
                  <div
                    className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-stone-200 bg-white px-3 py-3"
                    key={day}
                  >
                    <span className="font-mono text-xs font-semibold text-stone-500">
                      {day}
                    </span>
                    <span className="truncate text-sm font-semibold text-stone-900">
                      {label}
                    </span>
                    <span className="text-xs font-medium text-stone-500">
                      {value}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`col-span-3 h-2 rounded-[2px] ${color}`}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-lg border border-stone-200 bg-[#fbfbfa] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-stone-900">
                    Consistency map
                  </p>
                  <p className="font-mono text-xs text-stone-500">Jul 2026</p>
                </div>
                <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1">
                  {Array.from({ length: 84 }, (_, index) => {
                    const intensity = [
                      "bg-stone-200",
                      "bg-[#dbe8dc]",
                      "bg-[#a7c4ad]",
                      "bg-moss",
                    ][(index * 7 + index) % 4];

                    return (
                      <span
                        aria-hidden="true"
                        className={`aspect-square rounded-[2px] ${intensity}`}
                        key={index}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-14 md:grid-cols-3">
          {featureCards.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                className="rounded-lg border border-stone-300 bg-white/76 p-5 backdrop-blur transition hover:border-moss/35 hover:bg-white"
                key={feature.title}
              >
                <div className="grid h-10 w-10 place-items-center rounded-md bg-[#edf3ec] text-moss">
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-stone-950">
                  {feature.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
