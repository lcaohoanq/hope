"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaLanguage, FaMoon, FaSun } from "react-icons/fa";
import { getInitialTheme } from "@/components/dashboard/dashboard-utils";
import type { UpdateSettingsResponse } from "@/components/dashboard/workout-api";
import { getApiErrorMessage, getClientApiClient } from "@/lib/http";
import { type Language, languageOptions, translations } from "@/lib/i18n";
import type { AppTheme, PublicAppUser } from "@/lib/users";

export function AppearanceSettings({ user }: { user: PublicAppUser }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [language, setLanguage] = useState<Language>(user.preferredLanguage);
  const copy = translations[language];
  const themeStorageKey = `hope:theme:${user.id}`;
  const [theme, setTheme] = useState<AppTheme>(() =>
    getInitialTheme({
      fallbackTheme: user.settings.theme,
      isEditable: true,
      storageKey: themeStorageKey,
    }),
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  async function changeTheme(nextTheme: AppTheme) {
    if (nextTheme === theme || isSaving) return;
    const previousTheme = theme;
    setTheme(nextTheme);
    window.localStorage.setItem(themeStorageKey, nextTheme);
    setError("");
    setMessage(copy.header.savingTheme);
    setIsSaving(true);
    try {
      const client = getClientApiClient(await getToken());
      const response = await client.users.settings.$patch({ json: { theme: nextTheme } });
      const payload = (await response.json()) as UpdateSettingsResponse;
      if (!response.ok || !payload.success) {
        throw new Error("error" in payload ? payload.error : copy.header.themeUpdateFailed);
      }
      setTheme(payload.settings.theme);
      setMessage("");
    } catch (caught) {
      setTheme(previousTheme);
      window.localStorage.setItem(themeStorageKey, previousTheme);
      setMessage("");
      setError(getApiErrorMessage(caught, copy.header.themeUpdateFailed));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-border bg-panel p-5 sm:p-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          {theme === "light" ? <FaSun aria-hidden="true" /> : <FaMoon aria-hidden="true" />}
          <h3>{copy.header.theme}</h3>
        </div>
        <fieldset className="mt-4 inline-flex h-12 w-full items-center rounded-md border border-border bg-panel-muted p-1">
          <legend className="sr-only">{copy.header.theme}</legend>
          {(["light", "dark"] as const).map((option) => (
            <button
              aria-pressed={theme === option}
              className={`h-10 flex-1 rounded px-4 text-sm font-semibold transition ${theme === option ? "bg-panel text-text shadow-[0_1px_0_rgb(15_23_42/0.08)]" : "text-muted hover:text-text"}`}
              disabled={isSaving}
              key={option}
              onClick={() => void changeTheme(option)}
              type="button"
            >
              {option === "light" ? copy.header.light : copy.header.dark}
            </button>
          ))}
        </fieldset>
        {message || error ? (
          <p className={`mt-2 text-sm font-medium ${error ? "text-danger" : "text-muted"}`}>
            {error || message}
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-border bg-panel p-5 sm:p-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <FaLanguage aria-hidden="true" />
          <h3>{copy.common.language}</h3>
        </div>
        <label className="mt-4 block">
          <span className="sr-only">{copy.common.language}</span>
          <select
            className="h-12 w-full rounded-md border border-border bg-panel px-4 text-sm font-semibold text-text outline-none transition focus:border-accent"
            onChange={(event) => {
              setLanguage(event.target.value as Language);
              router.refresh();
            }}
            value={language}
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value === "vi" ? copy.header.vietnamese : copy.header.english}
              </option>
            ))}
          </select>
        </label>
      </section>
    </div>
  );
}
