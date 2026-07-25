"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaLanguage, FaMoon, FaSun } from "react-icons/fa";
import { getInitialTheme } from "@/components/dashboard/dashboard-utils";
import type { UpdateSettingsResponse } from "@/components/dashboard/workout-api";
import { LanguagePicker } from "@/components/settings/LanguagePicker";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { getApiErrorMessage, getClientApiClient } from "@/lib/http";
import { type Language, translations } from "@/lib/i18n";
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
    // setMessage(copy.header.savingTheme);
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
      <section>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            {theme === "light" ? <FaSun aria-hidden="true" /> : <FaMoon aria-hidden="true" />}
            <h3>{copy.header.theme}</h3>
          </div>
          <ThemeToggle
            ariaLabel={copy.header.theme}
            checked={theme === "dark"}
            disabled={isSaving}
            onCheckedChange={(isDark) => void changeTheme(isDark ? "dark" : "light")}
          />
        </div>
        {message || error ? (
          <p className={`mt-2 text-sm font-medium ${error ? "text-danger" : "text-muted"}`}>
            {error || message}
          </p>
        ) : null}
      </section>

      <section>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <FaLanguage aria-hidden="true" />
            <h3>{copy.common.language}</h3>
          </div>
          <LanguagePicker
            ariaLabel={copy.common.language}
            onChange={(nextLanguage) => {
              setLanguage(nextLanguage);
              router.refresh();
            }}
            value={language}
          />
        </div>
      </section>
    </div>
  );
}
