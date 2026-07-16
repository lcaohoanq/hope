"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getApiErrorMessage, getClientApiClient } from "@/lib/http";
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
  const { getToken } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
    setError("");
    try {
      const token = await getToken();
      const client = getClientApiClient(token);
      const res =
        status === "none"
          ? await client.profiles[":profileId"].follow.$post({ param: { profileId } })
          : await client.profiles[":profileId"].follow.$delete({ param: { profileId } });
      const payload = await res.json();
      if (!res.ok)
        throw new Error(("error" in payload && payload.error) || "Unable to update follow status.");
      setStatus(("relationshipStatus" in payload && payload.relationshipStatus) || "none");
      router.refresh();
    } catch (caught) {
      setError(getApiErrorMessage(caught, "Unable to update follow status."));
    } finally {
      setSaving(false);
    }
  }

  const label =
    status === "none" ? copy.follow : status === "pending" ? copy.requested : copy.unfollow;
  return (
    <>
      <button
        className={`h-10 w-full rounded-md px-4 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60 ${status === "none" ? "bg-accent text-accent-contrast" : "border border-border bg-panel text-text hover:bg-panel-muted"}`}
        disabled={saving}
        onClick={() => void toggle()}
        type="button"
      >
        {label}
      </button>
      {error ? (
        <p aria-live="polite" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}
