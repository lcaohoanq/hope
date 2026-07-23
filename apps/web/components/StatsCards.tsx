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
      <fieldset
        aria-label={
          isLarge
            ? copy.stats.last7DaysDetail
            : copy.stats.last30PaceDetail(days.filter((day) => day.count > 0).length)
        }
        className={
          isLarge
            ? "m-0 min-w-0 border-0 p-0 grid grid-cols-7 gap-2"
            : "m-0 min-w-0 border-0 p-0 grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[3px]"
        }
        onMouseLeave={() => setTooltip(null)}
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
      </fieldset>
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
  const strip = cell.closest('[role="group"]');

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
    <div className="streak-active-card group h-full min-w-0 rounded-2xl border border-white/20 p-4 text-white transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(20,99,48,0.28)] motion-reduce:transform-none motion-reduce:transition-none sm:p-5">
      <div className="relative z-[1] flex h-full min-w-0 flex-col">
        <div className="flex items-start justify-between gap-2.5">
          <p className="pt-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-white sm:text-[11px]">
            {copy.stats.currentStreak}
          </p>

          <span className="inline-flex max-w-[62%] items-start gap-1.5 rounded-full border border-white/15 bg-black/10 px-2.5 py-1 text-right text-[10px] font-semibold leading-tight text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm sm:max-w-[68%] sm:text-[11px]">
            <span
              aria-hidden="true"
              className="mt-[0.3em] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-200 shadow-[0_0_8px_rgba(167,243,208,0.8)]"
            />
            {primary}
          </span>
        </div>

        <div className="mt-4 flex min-w-0 items-center justify-between gap-4">
          <p className="flex min-w-0 items-end gap-2">
            <span className="text-5xl font-semibold leading-[0.86] tracking-[-0.065em] tabular-nums text-white drop-shadow-sm">
              {streak}
            </span>
            <span className="mb-0.5 text-sm font-medium leading-none text-white/90 sm:mb-1">
              {streak === 1 ? copy.stats.day : copy.stats.days}
            </span>
          </p>

          <div
            aria-hidden="true"
            className="streak-fire-badge relative grid h-14 w-14 shrink-0 place-items-center rounded-full border border-white/25 text-amber-100 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-0.5 group-hover:rotate-2 motion-reduce:transform-none motion-reduce:transition-none sm:h-16 sm:w-16"
          >
            <FaFire className="relative z-[1] h-6 w-6 drop-shadow-[0_2px_5px_rgba(120,53,15,0.35)] sm:h-7 sm:w-7" />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/15 bg-black/10 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
          <span
            aria-hidden="true"
            className="h-8 w-1 shrink-0 rounded-full bg-gradient-to-b from-amber-200 via-emerald-200 to-white/25"
          />
          <p className="min-w-0 text-xs font-semibold leading-snug text-white/90 sm:text-sm">
            {detail}
          </p>
          <span
            aria-hidden="true"
            className="ml-auto h-px w-8 shrink-0 bg-gradient-to-r from-white/45 to-transparent"
          />
        </div>
      </div>
    </div>
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
