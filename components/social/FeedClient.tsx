"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FeedItem } from "@/lib/social-types";
import type { Language } from "@/lib/i18n";
import { getSocialCopy } from "@/lib/social-copy";
import { getAvatarUrl } from "@/lib/profile-utils";
import { AvatarImage } from "@/components/dashboard/AvatarImage";

export function FeedClient({ language }: { language: Language }) {
  const copy = getSocialCopy(language);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  async function load(nextCursor?: string) {
    setLoading(true);
    const response = await fetch(`/api/feed${nextCursor ? `?cursor=${encodeURIComponent(nextCursor)}` : ""}`, { cache: "no-store" });
    const payload = await response.json() as { items?: FeedItem[]; nextCursor?: string | null };
    if (response.ok) { setItems((current) => nextCursor ? [...current, ...(payload.items ?? [])] : payload.items ?? []); setCursor(payload.nextCursor ?? null); }
    setLoading(false);
  }
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);

  if (!loading && items.length === 0) return <section className="rounded-lg border border-border bg-panel p-10 text-center"><p className="text-muted">{copy.emptyFeed}</p></section>;
  return <div className="grid gap-4">{items.map(({ workout, profile }) => <article className="overflow-hidden rounded-lg border border-border bg-panel" key={workout.id}><div className="flex items-center gap-3 p-4"><span className="h-10 w-10 overflow-hidden rounded-full"><AvatarImage alt="" className="h-full w-full object-cover" sizes="40px" src={profile.avatarUrl ?? getAvatarUrl(profile.avatarSeed)} /></span><div><Link className="text-sm font-semibold text-text" href={`/${profile.username}`}>{profile.displayName}</Link><p className="text-xs text-muted">@{profile.username} · {workout.date}</p></div></div>{workout.images?.[0] ? <div className="max-h-[620px] overflow-hidden bg-panel-muted"><img alt="" className="max-h-[620px] w-full object-cover" src={workout.images[0].src} /></div> : null}<div className="p-4"><h2 className="font-semibold text-text">{workout.type}</h2><p className="mt-1 text-sm text-muted">{workout.durationMinutes} min · {workout.startTime}–{workout.endTime}</p>{workout.note ? <p className="mt-3 text-sm leading-6 text-text">{workout.note}</p> : null}</div></article>)}{cursor ? <button className="h-11 rounded-md border border-border bg-panel text-sm font-semibold text-text" disabled={loading} onClick={() => void load(cursor)} type="button">{copy.loadMore}</button> : null}{loading ? <p className="py-4 text-center text-sm text-muted">…</p> : null}</div>;
}
