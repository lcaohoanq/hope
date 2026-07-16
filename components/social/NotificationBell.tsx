"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaBell } from "react-icons/fa";
import { apiClient } from "@/lib/http";
import type { Language } from "@/lib/i18n";
import { getSocialCopy } from "@/lib/social-copy";
import type { AppNotification } from "@/lib/social-types";

type NotificationPayload = { success: true; items: AppNotification[]; unreadCount: number };

function notificationHref(item: AppNotification) {
  if (item.workoutId) {
    return `/workouts/${item.workoutId}${item.commentId ? `#comment-${item.commentId}` : ""}`;
  }
  return item.actor ? `/${item.actor.username}` : "#";
}

export function NotificationBell({ language }: { language: Language }) {
  const copy = getSocialCopy(language);
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const lastRelationshipEventRef = useRef("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const { data: payload } = await apiClient.get<NotificationPayload>("/notifications", {
        headers: { "Cache-Control": "no-cache" },
      });
      const relationshipEvent = payload.items.find(
        (item) => item.type === "follow_accepted" || item.type === "new_follower",
      );
      if (relationshipEvent && relationshipEvent.id !== lastRelationshipEventRef.current) {
        lastRelationshipEventRef.current = relationshipEvent.id;
        router.refresh();
      }
      setItems(payload.items);
      setUnreadCount(payload.unreadCount);
    } catch {
      // Notification polling remains best effort.
    }
  }, [router]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void load();
    }, 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    const close = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", close);
    };
  }, [load, open]);

  async function respond(actorId: string, action: "accept" | "decline") {
    await apiClient.patch(`/follow-requests/${actorId}`, { action });
    await load();
    router.refresh();
  }

  async function markAllRead() {
    await apiClient.patch("/notifications", {});
    await load();
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-label={copy.notifications}
        className="relative grid h-10 w-10 place-items-center rounded-md text-muted transition hover:bg-panel-muted hover:text-text"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <FaBell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-bold leading-4 text-white">
            {Math.min(unreadCount, 99)}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[60] w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-panel shadow-[var(--shadow-panel)]">
          <div className="flex items-center justify-between border-b border-border p-3">
            <strong className="text-sm text-text">{copy.notifications}</strong>
            {unreadCount ? (
              <button
                className="text-xs font-semibold text-accent"
                onClick={() => void markAllRead()}
                type="button"
              >
                {copy.markAllRead}
              </button>
            ) : null}
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {items.length === 0 ? (
              <p className="p-4 text-sm text-muted">{copy.noNotifications}</p>
            ) : (
              items.map((item) => (
                <div
                  className={`rounded-md p-3 ${item.isRead ? "" : "bg-panel-muted"}`}
                  key={item.id}
                >
                  <p className="text-sm text-text">
                    <Link
                      className="font-semibold"
                      href={notificationHref(item)}
                      onClick={() => setOpen(false)}
                    >
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
                    <div className="mt-2 flex gap-2">
                      <button
                        className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-contrast"
                        onClick={() => item.actor && void respond(item.actor.id, "accept")}
                        type="button"
                      >
                        {copy.accept}
                      </button>
                      <button
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted"
                        onClick={() => item.actor && void respond(item.actor.id, "decline")}
                        type="button"
                      >
                        {copy.decline}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
          <div className="border-t border-border p-3">
            <Link
              className="text-sm font-semibold text-accent"
              href="/notifications"
              onClick={() => setOpen(false)}
            >
              {copy.viewAll}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
