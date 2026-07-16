"use client";

import { useCallback, useEffect, useState } from "react";
import { WorkoutSocialCard } from "@/components/social/WorkoutSocialCard";
import { apiClient, getApiErrorMessage } from "@/lib/http";
import type { Language } from "@/lib/i18n";
import { getSocialCopy } from "@/lib/social-copy";
import type { FeedItem } from "@/lib/social-types";
import type { PublicAppUser } from "@/lib/users";

export function FeedClient({ language, viewer }: { language: Language; viewer: PublicAppUser }) {
  const copy = getSocialCopy(language);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (nextCursor?: string) => {
      setLoading(true);
      setError("");
      try {
        const { data: payload } = await apiClient.get<{
          items?: FeedItem[];
          nextCursor?: string | null;
          error?: string;
        }>("/feed", {
          headers: { "Cache-Control": "no-cache" },
          params: { cursor: nextCursor },
        });
        setItems((current) =>
          nextCursor ? [...current, ...(payload.items ?? [])] : (payload.items ?? []),
        );
        setCursor(payload.nextCursor ?? null);
      } catch (caught) {
        setError(getApiErrorMessage(caught, copy.interactionFailed));
      } finally {
        setLoading(false);
      }
    },
    [copy.interactionFailed],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading && items.length === 0) return <FeedSkeleton />;
  if (!loading && items.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-panel p-10 text-center shadow-[var(--shadow-panel)]">
        <p className="text-muted">{error || copy.emptyFeed}</p>
        {error ? (
          <button
            className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast"
            onClick={() => void load()}
            type="button"
          >
            {copy.loadMore}
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      {items.map((item) => (
        <WorkoutSocialCard item={item} key={item.workout.id} language={language} viewer={viewer} />
      ))}
      {error ? (
        <p aria-live="polite" className="text-center text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      {cursor ? (
        <button
          className="h-11 rounded-md border border-border bg-panel text-sm font-semibold text-text transition hover:bg-panel-muted active:scale-[0.99] disabled:opacity-50"
          disabled={loading}
          onClick={() => void load(cursor)}
          type="button"
        >
          {loading ? `${copy.loadMore}...` : copy.loadMore}
        </button>
      ) : null}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div aria-label="Loading feed" className="grid gap-5" role="status">
      {[0, 1].map((item) => (
        <div
          className="overflow-hidden rounded-lg border border-border bg-panel shadow-[var(--shadow-panel)]"
          key={item}
        >
          <div className="flex items-center gap-3 p-5">
            <div className="h-11 w-11 animate-pulse rounded-full bg-panel-muted motion-reduce:animate-none" />
            <div className="grid flex-1 gap-2">
              <div className="h-3 w-32 animate-pulse rounded bg-panel-muted motion-reduce:animate-none" />
              <div className="h-2.5 w-48 animate-pulse rounded bg-panel-muted motion-reduce:animate-none" />
            </div>
          </div>
          <div className="aspect-[16/9] animate-pulse bg-panel-muted motion-reduce:animate-none" />
          <div className="grid gap-3 p-5">
            <div className="h-4 w-40 animate-pulse rounded bg-panel-muted motion-reduce:animate-none" />
            <div className="h-3 w-64 max-w-full animate-pulse rounded bg-panel-muted motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}
