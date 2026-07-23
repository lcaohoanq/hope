"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { getApiErrorMessage, getClientApiClient } from "@/lib/http";
import type { Language } from "@/lib/i18n";
import { getSocialCopy } from "@/lib/social-copy";
import type { AppNotification } from "@/lib/social-types";

function notificationHref(item: AppNotification) {
  if (item.workoutId) {
    return `/workouts/${item.workoutId}${item.commentId ? `#comment-${item.commentId}` : ""}`;
  }
  return item.actor ? `/${item.actor.username}` : "#";
}

export function NotificationsClient({ language }: { language: Language }) {
  const copy = getSocialCopy(language);
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["notifications-page"] as const;
  const [error, setError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const notificationsQuery = useQuery({
    queryKey,
    queryFn: async () => fetchNotifications(await getToken()),
  });
  const items = notificationsQuery.data?.items ?? [];
  const cursor = notificationsQuery.data?.nextCursor ?? null;

  async function loadMore(next: string) {
    setLoadingMore(true);
    try {
      const nextPage = await fetchNotifications(await getToken(), next);
      queryClient.setQueryData<NotificationsPageData>(queryKey, (current) => ({
        items: [...(current?.items ?? []), ...nextPage.items],
        nextCursor: nextPage.nextCursor,
      }));
    } catch {
      // Keep the current notification list when loading another page fails.
    } finally {
      setLoadingMore(false);
    }
  }

  async function markAll() {
    setError("");
    try {
      const token = await getToken();
      const client = getClientApiClient(token);
      const res = await client.notifications.$patch({ json: {} });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(("error" in data && data.error) || "Unable to update notifications.");
      }
      await notificationsQuery.refetch();
    } catch (caught) {
      setError(getApiErrorMessage(caught, "Unable to update notifications."));
    }
  }
  async function respond(actorId: string, action: "accept" | "decline") {
    setError("");
    try {
      const token = await getToken();
      const client = getClientApiClient(token);
      const res = await client["follow-requests"][":profileId"].$patch({
        param: { profileId: actorId },
        json: { action },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(("error" in data && data.error) || "Unable to update follow request.");
      }
      await notificationsQuery.refetch();
    } catch (caught) {
      setError(getApiErrorMessage(caught, "Unable to update follow request."));
    }
  }
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-panel">
      <div className="flex justify-end border-b border-border p-3">
        <button
          className="text-sm font-semibold text-accent"
          onClick={() => void markAll()}
          type="button"
        >
          {copy.markAllRead}
        </button>
      </div>
      {error ? (
        <p
          aria-live="polite"
          className="border-b border-border p-4 text-sm font-medium text-danger"
        >
          {error}
        </p>
      ) : null}
      {notificationsQuery.isPending ? (
        <p className="p-10 text-center text-muted">
          {language === "vi" ? "Đang tải thông báo..." : "Loading notifications..."}
        </p>
      ) : items.length === 0 ? (
        <p className="p-10 text-center text-muted">{copy.noNotifications}</p>
      ) : (
        <div className="divide-y divide-border">
          {items.map((item) => (
            <div className={`p-4 ${item.isRead ? "" : "bg-panel-muted"}`} key={item.id}>
              <p className="text-sm text-text">
                <Link className="font-semibold" href={notificationHref(item)}>
                  {item.actor?.displayName ?? copy.someone}
                </Link>{" "}
                {item.type === "follow_request"
                  ? copy.followRequest
                  : item.type === "new_follower"
                    ? copy.newFollower
                    : item.type === "follow_accepted"
                      ? copy.followAccepted
                      : item.type === "workout_liked"
                        ? copy.workoutLiked
                        : copy.workoutCommented}
              </p>
              {item.type === "follow_request" && item.actor ? (
                <div className="mt-3 flex gap-2">
                  <button
                    className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-contrast"
                    onClick={() => item.actor && void respond(item.actor.id, "accept")}
                    type="button"
                  >
                    {copy.accept}
                  </button>
                  <button
                    className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted"
                    onClick={() => item.actor && void respond(item.actor.id, "decline")}
                    type="button"
                  >
                    {copy.decline}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {cursor ? (
        <div className="border-t border-border p-3">
          <button
            disabled={loadingMore}
            className="w-full text-sm font-semibold text-accent"
            onClick={() => void loadMore(cursor)}
            type="button"
          >
            {loadingMore ? `${copy.loadMore}...` : copy.loadMore}
          </button>
        </div>
      ) : null}
    </section>
  );
}

type NotificationsPageData = {
  items: AppNotification[];
  nextCursor: string | null;
};

async function fetchNotifications(
  token: string | null,
  cursor?: string,
): Promise<NotificationsPageData> {
  const client = getClientApiClient(token);
  const res = await client.notifications.$get({ query: { cursor } });
  const payload = await res.json();
  if (!res.ok) throw new Error("Unable to load notifications.");
  return {
    items: "items" in payload ? (payload.items ?? []) : [],
    nextCursor: "nextCursor" in payload ? (payload.nextCursor ?? null) : null,
  };
}
