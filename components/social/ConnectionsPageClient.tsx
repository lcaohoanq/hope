"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ConnectionItem } from "@/lib/social-types";
import type { Language } from "@/lib/i18n";
import { getSocialCopy } from "@/lib/social-copy";
import { getAvatarUrl } from "@/lib/profile-utils";
import { AvatarImage } from "@/components/dashboard/AvatarImage";

export function ConnectionsPageClient({ profileId, type, language, canView }: { profileId: string; type: "followers" | "following"; language: Language; canView: boolean }) {
  const copy = getSocialCopy(language); const [items, setItems] = useState<ConnectionItem[]>([]); const [cursor, setCursor] = useState<string | null>(null);
  const load = useCallback(async (next?: string) => { const response = await fetch(`/api/profiles/${profileId}/connections?type=${type}${next ? `&cursor=${encodeURIComponent(next)}` : ""}`, { cache: "no-store" }); const payload = await response.json() as { items?: ConnectionItem[]; nextCursor?: string | null }; if (response.ok) { setItems((current) => next ? [...current, ...(payload.items ?? [])] : payload.items ?? []); setCursor(payload.nextCursor ?? null); } }, [profileId, type]);
  useEffect(() => { if (!canView) return; const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [canView, load]);
  if (!canView) return <p className="rounded-lg border border-border bg-panel p-8 text-center text-muted">{copy.connectionsPrivate}</p>;
  return <section className="overflow-hidden rounded-lg border border-border bg-panel"><div className="divide-y divide-border">{items.map(({ profile }) => <Link className="flex items-center gap-3 p-4 hover:bg-panel-muted" href={`/${profile.username}`} key={profile.id}><span className="h-12 w-12 overflow-hidden rounded-full"><AvatarImage alt="" className="h-full w-full object-cover" sizes="48px" src={profile.avatarUrl ?? getAvatarUrl(profile.avatarSeed)} /></span><span><strong className="block text-sm text-text">{profile.displayName}</strong><span className="text-xs text-muted">@{profile.username}</span></span></Link>)}</div>{cursor ? <button className="h-12 w-full border-t border-border text-sm font-semibold text-accent" onClick={() => void load(cursor)} type="button">{copy.loadMore}</button> : null}</section>;
}
