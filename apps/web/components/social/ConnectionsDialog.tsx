"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AvatarImage } from "@/components/dashboard/AvatarImage";
import { getClientApiClient } from "@/lib/http";
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
  const { getToken } = useAuth();
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
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      (async () => {
        try {
          const token = await getToken();
          const client = getClientApiClient(token);
          const res = await client.profiles[":profileId"].connections.$get({
            param: { profileId },
            query: { type },
          });
          if (cancelled) return;
          if (res.ok) {
            const data = await res.json();
            setItems("items" in data ? (data.items ?? []) : []);
          } else {
            setItems([]);
          }
        } catch {
          if (!cancelled) setItems([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canView, getToken, profileId, type]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <button
          className="flex items-center gap-1 rounded-md text-sm text-muted hover:text-accent"
          onClick={() => setType("followers")}
          type="button"
        >
          <strong className="min-w-[40px] text-base text-text">{followersCount}</strong>
          <span>{copy.followers}</span>
        </button>

        <button
          className="flex items-center gap-1 rounded-md text-sm text-muted hover:text-accent"
          onClick={() => setType("following")}
          type="button"
        >
          <strong className="min-w-[40px] text-base text-text">{followingCount}</strong>
          <span>{copy.following}</span>
        </button>
      </div>
      {dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
