"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiClient, getApiErrorMessage } from "@/lib/http";
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
  const [items, setItems] = useState<AppNotification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async (next?: string) => {
    try {
      const { data: payload } = await apiClient.get<{
        items?: AppNotification[];
        nextCursor?: string | null;
      }>("/notifications", {
        headers: { "Cache-Control": "no-cache" },
        params: { cursor: next },
      });
      setItems((current) =>
        next ? [...current, ...(payload.items ?? [])] : (payload.items ?? []),
      );
      setCursor(payload.nextCursor ?? null);
    } catch {
      // Keep the current notification list when a background refresh fails.
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function markAll() {
    setError("");
    try {
      await apiClient.patch("/notifications", {});
      await load();
    } catch (caught) {
      setError(getApiErrorMessage(caught, "Unable to update notifications."));
    }
  }
  async function respond(actorId: string, action: "accept" | "decline") {
    setError("");
    try {
      await apiClient.patch(`/follow-requests/${actorId}`, { action });
      await load();
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
      {items.length === 0 ? (
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
            className="w-full text-sm font-semibold text-accent"
            onClick={() => void load(cursor)}
            type="button"
          >
            {copy.loadMore}
          </button>
        </div>
      ) : null}
    </section>
  );
}
