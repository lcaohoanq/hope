"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AppNotification } from "@/lib/social-types";
import type { Language } from "@/lib/i18n";
import { getSocialCopy } from "@/lib/social-copy";

export function NotificationsClient({ language }: { language: Language }) {
  const copy = getSocialCopy(language);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  async function load(next?: string) { const response = await fetch(`/api/notifications${next ? `?cursor=${encodeURIComponent(next)}` : ""}`, { cache: "no-store" }); const payload = await response.json() as { items?: AppNotification[]; nextCursor?: string | null }; if (response.ok) { setItems((current) => next ? [...current, ...(payload.items ?? [])] : payload.items ?? []); setCursor(payload.nextCursor ?? null); } }
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);
  async function markAll() { await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" }); await load(); }
  async function respond(actorId: string, action: "accept" | "decline") { await fetch(`/api/follow-requests/${actorId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }); await load(); }
  return <section className="overflow-hidden rounded-lg border border-border bg-panel"><div className="flex justify-end border-b border-border p-3"><button className="text-sm font-semibold text-accent" onClick={() => void markAll()} type="button">{copy.markAllRead}</button></div>{items.length === 0 ? <p className="p-10 text-center text-muted">{copy.noNotifications}</p> : <div className="divide-y divide-border">{items.map((item) => <div className={`p-4 ${item.isRead ? "" : "bg-panel-muted"}`} key={item.id}><p className="text-sm text-text"><Link className="font-semibold" href={item.actor ? `/${item.actor.username}` : "#"}>{item.actor?.displayName ?? "Someone"}</Link>{" "}{item.type === "follow_request" ? copy.followRequest : item.type === "new_follower" ? copy.newFollower : copy.followAccepted}</p>{item.type === "follow_request" && item.actor ? <div className="mt-3 flex gap-2"><button className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-contrast" onClick={() => void respond(item.actor!.id, "accept")} type="button">{copy.accept}</button><button className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted" onClick={() => void respond(item.actor!.id, "decline")} type="button">{copy.decline}</button></div> : null}</div>)}</div>}{cursor ? <div className="border-t border-border p-3"><button className="w-full text-sm font-semibold text-accent" onClick={() => void load(cursor)} type="button">{copy.loadMore}</button></div> : null}</section>;
}
