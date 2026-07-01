import type { Workout } from "@/lib/workout-types";
import { getWorkoutStats } from "@/lib/workout-utils";

type StatsCardsProps = {
  workouts: Workout[];
  todayDateKey: string;
};

export function StatsCards({ workouts, todayDateKey }: StatsCardsProps) {
  const stats = getWorkoutStats(workouts, todayDateKey);
  const items = [
    {
      label: "Active days",
      value: stats.activeDays,
      detail: "logged in the visible year",
    },
    {
      label: "Last 30 days",
      value: `${stats.last30ActiveDays}/30`,
      detail: "days with movement",
    },
    {
      label: "Current streak",
      value: stats.streak,
      detail: stats.streak === 1 ? "day" : "days",
    },
    {
      label: "Total time",
      value: `${Math.round(stats.totalMinutes / 60)}h`,
      detail: `${stats.totalMinutes} minutes recorded`,
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          className="rounded-lg border border-stone-200 bg-white p-5 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(17,17,17,0.04)]"
          key={item.label}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone-500">
            {item.label}
          </p>
          <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-stone-950">
            {item.value}
          </p>
          <p className="mt-1 text-sm text-stone-500">{item.detail}</p>
        </div>
      ))}
    </section>
  );
}
