"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AvatarImage } from "@/components/dashboard/AvatarImage";
import { apiClient } from "@/lib/http";
import type { Language } from "@/lib/i18n";
import { getAvatarUrl } from "@/lib/profile-utils";
import { getSocialCopy } from "@/lib/social-copy";
import type { ConnectionItem } from "@/lib/social-types";

export function ConnectionsDialog({
  profileId,
  username,
  language,
  canView,
  followersCount,
  followingCount,
}: {
  profileId: string;
  username: string;
  language: Language;
  canView: boolean;
  followersCount: number;
  followingCount: number;
}) {
  const copy = getSocialCopy(language);
  const [type, setType] = useState<"followers" | "following" | null>(null);
  const [items, setItems] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dialog =
    type && typeof document !== "undefined" ? (
      <div className="fixed inset-0 z-[100000] grid place-items-center p-4">
        <button
          aria-label="Close connections dialog"
          className="absolute inset-0 cursor-default bg-text/45"
          onClick={() => setType(null)}
          type="button"
        />
        <div
          aria-modal="true"
          className="relative z-10 max-h-[75dvh] w-full max-w-md overflow-hidden rounded-lg border border-border bg-panel shadow-[var(--shadow-panel)]"
          role="dialog"
        >
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-semibold text-text">
              {type === "followers" ? copy.followers : copy.following}
            </h2>
            <button className="text-sm text-muted" onClick={() => setType(null)} type="button">
              ×
            </button>
          </div>
          <div className="max-h-[55dvh] overflow-y-auto p-2">
            {!canView ? (
              <p className="p-4 text-sm text-muted">{copy.connectionsPrivate}</p>
            ) : loading ? (
              <p className="p-4 text-sm text-muted">…</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-sm text-muted">—</p>
            ) : (
              items.map(({ profile }) => (
                <Link
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-panel-muted"
                  href={`/${profile.username}`}
                  key={profile.id}
                  onClick={() => setType(null)}
                >
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-panel-muted">
                    <AvatarImage
                      alt=""
                      className="h-full w-full object-cover"
                      sizes="40px"
                      src={profile.avatarUrl ?? getAvatarUrl(profile.avatarSeed)}
                    />
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm text-text">
                      {profile.displayName}
                    </strong>
                    <span className="block truncate text-xs text-muted">@{profile.username}</span>
                  </span>
                </Link>
              ))
            )}
          </div>
          {canView ? (
            <div className="border-t border-border p-3">
              <Link className="text-sm font-semibold text-accent" href={`/${username}/${type}`}>
                {copy.viewAll}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    ) : null;

  useEffect(() => {
    if (!type || !canView) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      apiClient
        .get<{ items?: ConnectionItem[] }>(`/profiles/${profileId}/connections`, {
          headers: { "Cache-Control": "no-cache" },
          params: { type },
          signal: controller.signal,
        })
        .then(({ data }) => {
          if (!controller.signal.aborted) setItems(data.items ?? []);
        })
        .catch(() => {
          if (!controller.signal.aborted) setItems([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [canView, profileId, type]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <button
          className="rounded-md border border-border bg-panel px-3 py-2 text-left text-xs text-muted hover:bg-panel-muted"
          onClick={() => setType("followers")}
          type="button"
        >
          <strong className="block text-base text-text">{followersCount}</strong>
          {copy.followers}
        </button>
        <button
          className="rounded-md border border-border bg-panel px-3 py-2 text-left text-xs text-muted hover:bg-panel-muted"
          onClick={() => setType("following")}
          type="button"
        >
          <strong className="block text-base text-text">{followingCount}</strong>
          {copy.following}
        </button>
      </div>
      {dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
