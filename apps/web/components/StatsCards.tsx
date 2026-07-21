"use client";

import { type ReactNode, useMemo, useState } from "react";
import { FaFire } from "react-icons/fa";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatDisplayDate } from "@/lib/date-utils";
import type { AppCopy, Language } from "@/lib/i18n";
import type { HeatmapView } from "@/lib/users";
import type { Workout } from "@/lib/workout-types";
import {
  type ActivityMixKey,
  getWorkoutStats,
  type WorkoutDayCount,
  type WorkoutStats,
} from "@/lib/workout-utils";

type StatsCardsProps = {
  copy: AppCopy;
  language: Language;
  workouts: Workout[];
  todayDateKey: string;
  view: HeatmapView;
};

const CHART = {
  accent: "#2EA043",
  study: "#3B82F6",
  other: "#A8A29E",
  muted: "oklch(var(--color-muted))",
  text: "oklch(var(--color-text))",
  panel: "oklch(var(--color-panel))",
  border: "oklch(var(--color-border))",
} as const;

const MIX_COLORS: Record<"workout" | "study" | "other", string> = {
  workout: CHART.accent,
  study: CHART.study,
  other: CHART.other,
};

export function StatsCards({ copy, language, workouts, todayDateKey, view }: StatsCardsProps) {
  const statsEndDateKey =
    view.mode === "year" && view.year < Number(todayDateKey.slice(0, 4))
      ? `${view.year}-12-31`
      : todayDateKey;
  const stats = getWorkoutStats(workouts, statsEndDateKey);
  const streakContext = getStreakContextCopy(copy, stats);
  const mixChartData = useMemo(() => {
    const total = stats.totalSessions || 1;

    return stats.activityMix
      .map((entry) => ({
        ...entry,
        name: copy.activity.labels[entry.key],
        fill: MIX_COLORS[entry.key],
        percent: Math.round((entry.count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [copy.activity.labels, stats.activityMix, stats.totalSessions]);
  const paceEndLabel =
    statsEndDateKey === todayDateKey
      ? copy.stats.last30EndToday
      : formatShortDateLabel(statsEndDateKey, language);

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {stats.streak > 0 ? (
        <StreakActiveCard
          copy={copy}
          detail={
            stats.longestStreak > 0
              ? copy.stats.personalBest(stats.longestStreak)
              : copy.stats.personalBestEmpty
          }
          primary={streakContext.primary}
          streak={stats.streak}
        />
      ) : (
        <StatCard
          detail={
            stats.longestStreak > 0
              ? copy.stats.personalBest(stats.longestStreak)
              : copy.stats.personalBestEmpty
          }
          label={copy.stats.currentStreak}
          value={stats.streak}
          valueSuffix={stats.streak === 1 ? copy.stats.day : copy.stats.days}
        >
          <div className="grid gap-1">
            <p className="text-sm font-medium text-text">{streakContext.primary}</p>
            {streakContext.action ? (
              <p className="text-sm text-muted">{streakContext.action}</p>
            ) : null}
          </div>
        </StatCard>
      )}

      <StatCard
        detail={copy.stats.last7DaysDetail}
        label={copy.stats.last7Days}
        value={`${stats.thisWeekActiveDays}/7`}
      >
        <ActivityDayStrip
          copy={copy}
          days={stats.thisWeekSeries}
          language={language}
          showWeekdayLabels
          size="large"
        />
      </StatCard>

      <StatCard
        detail={copy.stats.last30PaceDetail(stats.last30ActiveDays)}
        label={copy.stats.last30Pace}
        value={`${stats.last30Consistency}%`}
      >
        <div className="grid gap-3">
          <ActivityDayStrip
            copy={copy}
            days={stats.last30Series}
            language={language}
            size="compact"
          />
          <div className="flex items-center justify-between gap-3 text-[11px] text-muted">
            <span>{copy.stats.last30Start}</span>
            <span>{paceEndLabel}</span>
          </div>
        </div>
      </StatCard>

      <StatCard
        detail={mixChartData.length > 0 ? undefined : copy.stats.activityMixEmpty}
        label={copy.stats.activityMix}
        value={stats.totalSessions}
        valueSuffix={copy.stats.activityCount(stats.totalSessions)}
      >
        {mixChartData.length > 0 ? (
          <div className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] items-center gap-4">
            <div className="h-28">
              <ResponsiveContainer height="100%" width="100%">
                <PieChart>
                  <Pie
                    data={mixChartData}
                    dataKey="count"
                    innerRadius="62%"
                    outerRadius="90%"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {mixChartData.map((entry) => (
                      <Cell fill={entry.fill} key={entry.key} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [Number(value), String(name)]}
                    labelStyle={{ color: CHART.text }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="grid gap-2.5">
              {mixChartData.map((entry) => (
                <li className="flex items-center justify-between gap-3 text-sm" key={entry.key}>
                  <span className="inline-flex min-w-0 items-center gap-2 text-text">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: entry.fill }}
                    />
                    <span className="truncate">{entry.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {entry.count}
                    <span className="mx-1.5 text-border">·</span>
                    {entry.percent}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex h-28 items-center justify-center text-sm text-muted">
            {copy.stats.activityMixEmpty}
          </div>
        )}
      </StatCard>
    </section>
  );
}

function ActivityDayStrip({
  copy,
  days,
  language,
  showWeekdayLabels = false,
  size,
}: {
  copy: AppCopy;
  days: WorkoutDayCount[];
  language: Language;
  showWeekdayLabels?: boolean;
  size: "large" | "compact";
}) {
  const [tooltip, setTooltip] = useState<{
    day: WorkoutDayCount;
    left: number;
  } | null>(null);
  const isLarge = size === "large";

  return (
    <div className="relative">
      <div
        aria-label={
          isLarge
            ? copy.stats.last7DaysDetail
            : copy.stats.last30PaceDetail(days.filter((day) => day.count > 0).length)
        }
        className={
          isLarge ? "grid grid-cols-7 gap-2" : "grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[3px]"
        }
        onMouseLeave={() => setTooltip(null)}
        role="img"
      >
        {days.map((day, index) => {
          const isActive = day.count > 0;
          const isEnd = index === days.length - 1;

          return (
            <div className="grid gap-1.5" key={day.date}>
              <button
                aria-label={`${formatDisplayDate(day.date, language)}: ${
                  isActive ? copy.stats.last30TooltipCount(day.count) : copy.stats.last30TooltipIdle
                }`}
                className={`w-full rounded-[3px] outline-none transition duration-150 ${
                  isLarge ? "aspect-square min-h-[36px] rounded-md" : "aspect-square min-h-[12px]"
                } ${isActive ? "bg-[#2EA043]" : "bg-border"} ${
                  isEnd
                    ? "ring-2 ring-text ring-offset-2 ring-offset-panel"
                    : "hover:ring-1 hover:ring-text/25"
                }`}
                onBlur={() => setTooltip(null)}
                onFocus={(event) => {
                  setTooltip(getDayTooltipPosition(event.currentTarget, day));
                }}
                onMouseEnter={(event) => {
                  setTooltip(getDayTooltipPosition(event.currentTarget, day));
                }}
                type="button"
              />
              {showWeekdayLabels ? (
                <span className="text-center text-[11px] text-muted">
                  {formatWeekdayLabel(day.date, language)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      {tooltip ? (
        <div
          className="pointer-events-none absolute bottom-full z-20 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-md border border-border bg-panel px-3 py-2 text-left shadow-[0_12px_28px_rgba(28,25,23,0.18)]"
          style={{ left: tooltip.left }}
        >
          <p className="text-xs font-semibold text-text">
            {formatDisplayDate(tooltip.day.date, language)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {tooltip.day.count > 0
              ? copy.stats.last30TooltipCount(tooltip.day.count)
              : copy.stats.last30TooltipIdle}
          </p>
          {tooltip.day.types.length > 0 ? (
            <p className="mt-1 text-xs text-muted">
              {formatActivityTypeLabels(tooltip.day.types, copy)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function getDayTooltipPosition(cell: HTMLElement, day: WorkoutDayCount) {
  const strip = cell.closest('[role="img"]');

  if (!(strip instanceof HTMLElement)) {
    return { day, left: 0 };
  }

  const stripRect = strip.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();

  return {
    day,
    left: cellRect.left + cellRect.width / 2 - stripRect.left,
  };
}

function formatActivityTypeLabels(types: ActivityMixKey[], copy: AppCopy) {
  return types.map((type) => copy.activity.labels[type]).join(" · ");
}

function getStreakContextCopy(copy: AppCopy, stats: WorkoutStats) {
  if (stats.daysSinceLastActive === null) {
    return {
      primary: copy.stats.streakStart,
      action: copy.stats.streakStartAction,
    };
  }

  if (stats.streak > 0) {
    if (stats.streak >= stats.longestStreak) {
      return { primary: copy.stats.streakMatchingBest };
    }

    return { primary: copy.stats.streakDaysToBeat(stats.longestStreak - stats.streak) };
  }

  if (stats.daysSinceLastActive === 1) {
    return {
      primary: copy.stats.streakMissedToday,
      action: copy.stats.streakStartAction,
    };
  }

  return {
    primary: copy.stats.streakLastActiveDaysAgo(stats.daysSinceLastActive),
    action: copy.stats.streakStartAction,
  };
}

function StreakActiveCard({
  copy,
  detail,
  primary,
  streak,
}: {
  copy: AppCopy;
  detail: string;
  primary: string;
  streak: number;
}) {
  return (
    <div className="streak-active-card rounded-lg p-5 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5">
      <div className="relative z-[1]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white shadow-[0_0_18px_rgba(255,255,255,0.35)]">
              <FaFire aria-hidden="true" className="h-4 w-4" />
            </span>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/85">
              {copy.stats.currentStreak}
            </p>
          </div>
          <span aria-hidden="true" className="streak-active-sparkle text-white/90">
            <SparkleIcon className="h-4 w-4" />
          </span>
        </div>

        <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
          {streak}
          <span className="ml-2 text-sm font-medium tracking-normal text-white/85">
            {streak === 1 ? copy.stats.day : copy.stats.days}
          </span>
        </p>
        <p className="mt-1 text-sm text-white/80">{detail}</p>

        <div className="relative mt-4">
          <p className="text-sm font-medium text-white">{primary}</p>
          <span
            aria-hidden="true"
            className="streak-active-sparkle streak-active-sparkle-delay absolute -right-1 -top-2 text-white/80"
          >
            <SparkleIcon className="h-3 w-3" />
          </span>
        </div>
      </div>
    </div>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 0c.3 3.2 1.4 5.4 4.2 7.2C9.4 9 8.3 11.2 8 14.4 7.7 11.2 6.6 9 3.8 7.2 6.6 5.4 7.7 3.2 8 0Z" />
    </svg>
  );
}

function StatCard({
  children,
  detail,
  label,
  value,
  valueSuffix,
}: {
  children: ReactNode;
  detail?: string;
  label: string;
  value: string | number;
  valueSuffix?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-5 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(17,17,17,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-text">
            {value}
            {valueSuffix ? (
              <span className="ml-2 text-sm font-medium tracking-normal text-muted">
                {valueSuffix}
              </span>
            ) : null}
          </p>
          {detail ? <p className="mt-1 text-sm text-muted">{detail}</p> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function formatWeekdayLabel(dateKey: string, language: Language) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en", {
    weekday: "narrow",
  }).format(new Date(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

function formatShortDateLabel(dateKey: string, language: Language) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en", {
    month: "short",
    day: "numeric",
  }).format(new Date(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

const tooltipStyle = {
  background: CHART.panel,
  border: `1px solid ${CHART.border}`,
  borderRadius: 8,
  color: CHART.text,
  fontSize: 12,
};
