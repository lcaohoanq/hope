"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { WorkoutSocialCard } from "@/components/social/WorkoutSocialCard";
import { getApiErrorMessage, getClientApiClient } from "@/lib/http";
import type { Language } from "@/lib/i18n";
import { getSocialCopy } from "@/lib/social-copy";
import type { FeedItem } from "@/lib/social-types";
import type { PublicAppUser } from "@/lib/users";

export function FeedClient({ language, viewer }: { language: Language; viewer: PublicAppUser }) {
  const copy = getSocialCopy(language);
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["social-feed", viewer.id] as const;
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const feedQuery = useQuery({
    queryKey,
    queryFn: async () => fetchFeedPage(await getToken()),
  });
  const items = feedQuery.data?.items ?? [];
  const cursor = feedQuery.data?.nextCursor ?? null;
  const error = feedQuery.error
    ? getApiErrorMessage(feedQuery.error, copy.interactionFailed)
    : loadMoreError;

  async function loadMore(nextCursor: string) {
    setLoadingMore(true);
    setLoadMoreError("");
    try {
      const nextPage = await fetchFeedPage(await getToken(), nextCursor);
      queryClient.setQueryData<FeedPageData>(queryKey, (current) => ({
        items: [...(current?.items ?? []), ...nextPage.items],
        nextCursor: nextPage.nextCursor,
      }));
    } catch (caught) {
      setLoadMoreError(getApiErrorMessage(caught, copy.interactionFailed));
    } finally {
      setLoadingMore(false);
    }
  }

  if (feedQuery.isPending && items.length === 0) return <FeedSkeleton />;
  if (!feedQuery.isPending && items.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-panel p-10 text-center shadow-[var(--shadow-panel)]">
        <p className="text-muted">{error || copy.emptyFeed}</p>
        {error ? (
          <button
            className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast"
            onClick={() => void feedQuery.refetch()}
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
          disabled={loadingMore}
          onClick={() => void loadMore(cursor)}
          type="button"
        >
          {loadingMore ? `${copy.loadMore}...` : copy.loadMore}
        </button>
      ) : null}
    </div>
  );
}

type FeedPageData = {
  items: FeedItem[];
  nextCursor: string | null;
};

async function fetchFeedPage(token: string | null, cursor?: string): Promise<FeedPageData> {
  const client = getClientApiClient(token);
  const res = await client.feed.$get({ query: { cursor } });
  const payload = await res.json();
  if (!res.ok) {
    throw new Error(("error" in payload && payload.error) || "Unable to load the social feed.");
  }
  return {
    items: "items" in payload ? (payload.items ?? []) : [],
    nextCursor: "nextCursor" in payload ? (payload.nextCursor ?? null) : null,
  };
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
