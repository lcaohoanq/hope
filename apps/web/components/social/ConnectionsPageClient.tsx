"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AvatarImage } from "@/components/dashboard/AvatarImage";
import { getApiErrorMessage, getClientApiClient } from "@/lib/http";
import type { Language } from "@/lib/i18n";
import { getAvatarUrl } from "@/lib/profile-utils";
import { getSocialCopy } from "@/lib/social-copy";
import type { ConnectionItem } from "@/lib/social-types";

export function ConnectionsPageClient({
  profileId,
  type,
  language,
  canView,
}: {
  profileId: string;
  type: "followers" | "following";
  language: Language;
  canView: boolean;
}) {
  const copy = getSocialCopy(language);
  const { getToken } = useAuth();
  const [items, setItems] = useState<ConnectionItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(
    async (next?: string) => {
      setError("");
      try {
        const token = await getToken();
        const client = getClientApiClient(token);
        const res = await client.profiles[":profileId"].connections.$get({
          param: { profileId },
          query: { cursor: next, type },
        });
        const payload = await res.json();
        if (!res.ok)
          throw new Error(("error" in payload && payload.error) || "Unable to load connections.");
        setItems((current) =>
          next
            ? [...current, ...("items" in payload ? (payload.items ?? []) : [])]
            : "items" in payload
              ? (payload.items ?? [])
              : [],
        );
        setCursor("nextCursor" in payload ? (payload.nextCursor ?? null) : null);
      } catch (caught) {
        setError(getApiErrorMessage(caught, "Unable to load connections."));
      }
    },
    [getToken, profileId, type],
  );
  useEffect(() => {
    if (!canView) return;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [canView, load]);
  if (!canView)
    return (
      <p className="rounded-lg border border-border bg-panel p-8 text-center text-muted">
        {copy.connectionsPrivate}
      </p>
    );
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-panel">
      {error ? (
        <p
          aria-live="polite"
          className="border-b border-border p-4 text-sm font-medium text-danger"
        >
          {error}
        </p>
      ) : null}
      <div className="divide-y divide-border">
        {items.map(({ profile }) => (
          <Link
            className="flex items-center gap-3 p-4 hover:bg-panel-muted"
            href={`/${profile.username}`}
            key={profile.id}
          >
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-panel-muted">
              <AvatarImage
                alt=""
                className="h-full w-full object-cover"
                sizes="48px"
                src={profile.avatarUrl ?? getAvatarUrl(profile.avatarSeed)}
              />
            </span>
            <span>
              <strong className="block text-sm text-text">{profile.displayName}</strong>
              <span className="text-xs text-muted">@{profile.username}</span>
            </span>
          </Link>
        ))}
      </div>
      {cursor ? (
        <button
          className="h-12 w-full border-t border-border text-sm font-semibold text-accent"
          onClick={() => void load(cursor)}
          type="button"
        >
          {copy.loadMore}
        </button>
      ) : null}
    </section>
  );
}
