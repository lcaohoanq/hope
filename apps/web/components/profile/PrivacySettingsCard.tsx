"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { getApiErrorMessage, getClientApiClient } from "@/lib/http";
import { getSocialCopy } from "@/lib/social-copy";
import type { PublicAppUser } from "@/lib/users";

export function PrivacySettingsCard({ user }: { user: PublicAppUser }) {
  const copy = getSocialCopy(user.preferredLanguage);
  const { getToken } = useAuth();
  const [isPrivate, setIsPrivate] = useState(user.isPrivate);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function update(next: boolean) {
    const previous = isPrivate;
    setIsPrivate(next);
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const token = await getToken();
      const client = getClientApiClient(token);
      const res = await client.users.privacy.$patch({ json: { isPrivate: next } });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(("error" in data && data.error) || copy.privacyFailed);
      }
      setMessage(copy.privacySaved);
    } catch (caught) {
      setIsPrivate(previous);
      setError(getApiErrorMessage(caught, copy.privacyFailed));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-lg font-semibold text-text">
            {isPrivate ? copy.privateProfileSetting : copy.publicProfile}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{copy.privacyHelp}</p>
        </div>
        <button
          aria-checked={isPrivate}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${isPrivate ? "bg-accent" : "bg-panel-muted ring-1 ring-border"}`}
          disabled={saving}
          onClick={() => void update(!isPrivate)}
          role="switch"
          type="button"
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${isPrivate ? "left-6" : "left-1"}`}
          />
        </button>
      </div>
      {isPrivate ? <p className="mt-4 text-xs text-muted">{copy.privacyPublicWarning}</p> : null}
      {message ? <p className="mt-4 text-sm font-medium text-accent">{message}</p> : null}
      {error ? <p className="mt-4 text-sm font-medium text-danger">{error}</p> : null}
    </section>
  );
}
