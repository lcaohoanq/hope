"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaBell } from "react-icons/fa";
import type { Language } from "@/lib/i18n";
import { getSocialCopy } from "@/lib/social-copy";
import type { AppNotification } from "@/lib/social-types";

type NotificationPayload = { success: true; items: AppNotification[]; unreadCount: number };

export function NotificationBell({ language }: { language: Language }) {
  const copy = getSocialCopy(language);
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const lastRelationshipEventRef = useRef("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as NotificationPayload;
    const relationshipEvent = payload.items.find(
      (item) => item.type === "follow_accepted" || item.type === "new_follower",
    );
    if (relationshipEvent && relationshipEvent.id !== lastRelationshipEventRef.current) {
      lastRelationshipEventRef.current = relationshipEvent.id;
      router.refresh();
    }
    setItems(payload.items);
    setUnreadCount(payload.unreadCount);
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
    await fetch(`/api/follow-requests/${actorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
    router.refresh();
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
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
                      href={item.actor ? `/${item.actor.username}` : "#"}
                    >
                      {item.actor?.displayName ?? "Someone"}
                    </Link>{" "}
                    {item.type === "follow_request"
                      ? copy.followRequest
                      : item.type === "new_follower"
                        ? copy.newFollower
                        : copy.followAccepted}
                  </p>
                  {item.type === "follow_request" && item.actor ? (
                    <div className="mt-2 flex gap-2">
                      <button
                        className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-contrast"
                        onClick={() => void respond(item.actor!.id, "accept")}
                        type="button"
                      >
                        {copy.accept}
                      </button>
                      <button
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted"
                        onClick={() => void respond(item.actor!.id, "decline")}
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
