"use client";

import { useAuth } from "@clerk/nextjs";
import type { LeaderboardEntry, LeaderboardPeriod } from "@hope/shared";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AvatarImage } from "@/components/dashboard/AvatarImage";
import { getApiErrorMessage, getClientApiClient, parseApiJson } from "@/lib/http";
import type { Language } from "@/lib/i18n";
import { getSocialCopy } from "@/lib/social-copy";

const PERIODS: LeaderboardPeriod[] = ["weekly", "monthly", "all-time"];

type LeaderboardResponse = {
  success: true;
  period: LeaderboardPeriod;
  range: { start: string | null; end: string };
  entries: LeaderboardEntry[];
};

export function LeaderboardClient({ language }: { language: Language }) {
  const copy = getSocialCopy(language);
  const { getToken } = useAuth();
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [range, setRange] = useState<{ start: string | null; end: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (nextPeriod: LeaderboardPeriod) => {
      setLoading(true);
      setError("");
      try {
        const token = await getToken();
        const client = getClientApiClient(token);
        const res = await client.leaderboard.$get({ query: { period: nextPeriod } });
        const payload = await parseApiJson<LeaderboardResponse | { success: false; error: string }>(
          res,
        );
        if (!res.ok || !("entries" in payload)) {
          throw new Error(("error" in payload && payload.error) || copy.leaderboardLoadError);
        }
        setEntries(payload.entries);
        setRange(payload.range);
      } catch (caught) {
        setError(getApiErrorMessage(caught, copy.leaderboardLoadError));
        setEntries([]);
        setRange(null);
      } finally {
        setLoading(false);
      }
    },
    [copy.leaderboardLoadError, getToken],
  );

  useEffect(() => {
    void load(period);
  }, [load, period]);

  const periodLabel = {
    weekly: copy.leaderboardWeekly,
    monthly: copy.leaderboardMonthly,
    "all-time": copy.leaderboardAllTime,
  } as const;

  return (
    <div className="grid gap-6">
      <div aria-label={copy.leaderboardPeriods} className="flex flex-wrap gap-2" role="tablist">
        {PERIODS.map((value) => {
          const selected = value === period;
          return (
            <button
              aria-selected={selected}
              className={`h-10 rounded-md px-4 text-sm font-semibold transition ${
                selected
                  ? "bg-accent text-accent-contrast"
                  : "border border-border bg-panel text-muted hover:bg-panel-muted hover:text-text"
              }`}
              key={value}
              onClick={() => setPeriod(value)}
              role="tab"
              type="button"
            >
              {periodLabel[value]}
            </button>
          );
        })}
      </div>

      {range ? (
        <p className="text-sm text-muted">
          {copy.leaderboardRange(range.start ?? copy.leaderboardAllTime, range.end)}
        </p>
      ) : null}

      {loading ? <p className="text-sm text-muted">{copy.leaderboardLoading}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error && entries.length === 0 ? (
        <p className="text-sm text-muted">{copy.leaderboardEmpty}</p>
      ) : null}

      {!loading && !error && entries.length > 0 ? (
        <ol className="overflow-hidden rounded-xl border border-border bg-panel">
          {entries.map((entry) => (
            <li
              className={`flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0 sm:px-5 ${
                entry.isViewer ? "bg-panel-muted/60" : ""
              }`}
              key={entry.profileId}
            >
              <span className="w-8 shrink-0 text-sm font-semibold text-muted tabular-nums">
                #{entry.rank}
              </span>
              <Link className="flex min-w-0 flex-1 items-center gap-3" href={`/${entry.username}`}>
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-panel-muted">
                  {entry.avatarUrl ? (
                    <AvatarImage
                      alt={`${entry.displayName}'s avatar`}
                      className="h-full w-full object-cover"
                      sizes="40px"
                      src={entry.avatarUrl}
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted">
                      {entry.displayName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-text">
                    {entry.displayName}
                    {entry.isViewer ? (
                      <span className="ml-2 text-xs font-medium text-accent">
                        {copy.leaderboardYou}
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-sm text-muted">@{entry.username}</span>
                </span>
              </Link>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-text">
                {copy.leaderboardPoints(entry.totalPoints)}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
