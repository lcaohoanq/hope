"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaChevronLeft, FaLanguage, FaMoon, FaSignOutAlt, FaSun } from "react-icons/fa";
import { getInitialTheme } from "@/components/dashboard/dashboard-utils";
import type { UpdateSettingsResponse } from "@/components/dashboard/workout-api";
import { getApiErrorMessage, getClientApiClient } from "@/lib/http";
import { type Language, languageOptions, translations } from "@/lib/i18n";
import type { AppTheme, PublicAppUser } from "@/lib/users";

type SettingsClientProps = {
  user: PublicAppUser;
};

export function SettingsClient({ user }: SettingsClientProps) {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
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
  const [themeMessage, setThemeMessage] = useState("");
  const [themeError, setThemeError] = useState("");
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  const themeOptions: Array<{ label: string; value: AppTheme }> = [
    { label: copy.header.light, value: "light" },
    { label: copy.header.dark, value: "dark" },
  ];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [theme]);

  async function handleThemeChange(nextTheme: AppTheme) {
    if (nextTheme === theme || isSavingTheme) {
      return;
    }

    const previousTheme = theme;

    setTheme(nextTheme);
    window.localStorage.setItem(themeStorageKey, nextTheme);
    setThemeError("");
    setThemeMessage(copy.header.savingTheme);
    setIsSavingTheme(true);

    try {
      const token = await getToken();
      const client = getClientApiClient(token);
      const res = await client.users.settings.$patch({ json: { theme: nextTheme } });
      const payload = (await res.json()) as UpdateSettingsResponse;

      if (!res.ok || !payload.success) {
        throw new Error("error" in payload ? payload.error : copy.header.themeUpdateFailed);
      }

      setTheme(payload.settings.theme);
      setThemeMessage("");
    } catch (error) {
      setTheme(previousTheme);
      window.localStorage.setItem(themeStorageKey, previousTheme);
      setThemeMessage("");
      setThemeError(getApiErrorMessage(error, copy.header.themeUpdateFailed));
    } finally {
      setIsSavingTheme(false);
    }
  }

  async function handleSignOut() {
    await signOut({ redirectUrl: "/login" });
  }

  return (
    <main className="min-h-[100dvh] bg-app text-text">
      <header className="border-b border-border bg-app px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-muted transition hover:bg-panel-muted hover:text-text"
            href={`/${user.username}`}
          >
            <FaChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
            {copy.common.profile}
          </Link>
          <h1 className="text-xl font-semibold text-text">{copy.common.settings}</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6">
          {/* Theme Settings */}
          <section className="rounded-lg border border-border bg-panel p-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-text">
              {theme === "light" ? (
                <FaSun aria-hidden="true" className="h-5 w-5" />
              ) : (
                <FaMoon aria-hidden="true" className="h-5 w-5" />
              )}
              <h2>{copy.header.theme}</h2>
            </div>
            <div className="mt-4">
              <fieldset className="inline-flex h-12 w-full items-center rounded-md border border-border bg-panel-muted p-1">
                <legend className="sr-only">{copy.header.theme}</legend>
                {themeOptions.map((option) => (
                  <button
                    aria-pressed={theme === option.value}
                    className={`h-10 flex-1 rounded px-4 text-sm font-semibold transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      theme === option.value
                        ? "bg-panel text-text shadow-[0_1px_0_rgb(15_23_42/0.08)]"
                        : "text-muted hover:text-text"
                    }`}
                    disabled={isSavingTheme}
                    key={option.value}
                    onClick={() => void handleThemeChange(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </fieldset>
              {themeMessage || themeError ? (
                <p
                  className={`mt-2 text-sm font-medium ${
                    themeError ? "text-danger" : "text-muted"
                  }`}
                >
                  {themeError || themeMessage}
                </p>
              ) : null}
            </div>
          </section>

          {/* Language Settings */}
          <section className="rounded-lg border border-border bg-panel p-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-text">
              <FaLanguage aria-hidden="true" className="h-5 w-5" />
              <h2>{copy.common.language}</h2>
            </div>
            <div className="mt-4">
              <label className="block">
                <span className="sr-only">{copy.common.language}</span>
                <select
                  className="h-12 w-full rounded-md border border-border bg-panel px-4 text-sm font-semibold text-text outline-none transition focus:border-accent"
                  onChange={(event) => {
                    const newLang = event.target.value as Language;
                    setLanguage(newLang);
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
            </div>
          </section>

          {/* Sign Out */}
          <section className="rounded-lg border border-border bg-panel p-6">
            <button
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-danger px-4 text-sm font-semibold text-white transition hover:bg-danger/90 active:scale-[0.98]"
              onClick={() => void handleSignOut()}
              type="button"
            >
              <FaSignOutAlt aria-hidden="true" className="h-4 w-4" />
              {copy.common.signOut}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
