"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Language } from "@/lib/i18n";
import { getSocialCopy } from "@/lib/social-copy";
import type { RelationshipStatus } from "@/lib/social-types";

export function FollowButton({
  authenticated,
  initialStatus,
  language,
  profileId,
  profilePath,
}: {
  authenticated: boolean;
  initialStatus: RelationshipStatus;
  language: Language;
  profileId: string;
  profilePath: string;
}) {
  const copy = getSocialCopy(language);
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  if (status === "self") return null;
  if (!authenticated) {
    return (
      <Link
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-contrast"
        href={`/login?next=${encodeURIComponent(profilePath)}`}
      >
        {copy.follow}
      </Link>
    );
  }

  async function toggle() {
    setSaving(true);
    try {
      const response = await fetch(`/api/profiles/${profileId}/follow`, {
        method: status === "none" ? "POST" : "DELETE",
      });
      const payload = (await response.json()) as {
        relationshipStatus?: RelationshipStatus;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Unable to update follow status.");
      setStatus(payload.relationshipStatus ?? "none");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const label =
    status === "none" ? copy.follow : status === "pending" ? copy.requested : copy.unfollow;
  return (
    <button
      className={`h-10 w-full rounded-md px-4 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60 ${status === "none" ? "bg-accent text-accent-contrast" : "border border-border bg-panel text-text hover:bg-panel-muted"}`}
      disabled={saving}
      onClick={() => void toggle()}
      type="button"
    >
      {label}
    </button>
  );
}
