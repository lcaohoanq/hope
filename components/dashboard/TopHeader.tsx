"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  FaChevronDown,
  FaLanguage,
  FaMoon,
  FaSignInAlt,
  FaSignOutAlt,
  FaSun,
  FaUser,
} from "react-icons/fa";
import { languageOptions, type AppCopy, type Language } from "@/lib/i18n";
import type { AppTheme, PublicAppUser } from "@/lib/users";
import { AvatarImage } from "./AvatarImage";

type TopHeaderProps = {
  avatarUrl: string;
  copy: AppCopy;
  isSavingTheme: boolean;
  language: Language;
  onLanguageChange: (language: Language) => void;
  onSignOut: () => void;
  onThemeChange: (theme: AppTheme) => void;
  showProfileShortcut: boolean;
  showSignOut: boolean;
  showThemeControl: boolean;
  theme: AppTheme;
  themeError: string;
  themeMessage: string;
  user: PublicAppUser;
};

export function TopHeader({
  avatarUrl,
  copy,
  isSavingTheme,
  language,
  onLanguageChange,
  onSignOut,
  onThemeChange,
  showProfileShortcut,
  showSignOut,
  showThemeControl,
  theme,
  themeError,
  themeMessage,
  user,
}: TopHeaderProps) {
  const profilePath = `/${user.username}`;
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const themeOptions: Array<{ label: string; value: AppTheme }> = [
    { label: copy.header.light, value: "light" },
    { label: copy.header.dark, value: "dark" },
  ];

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  return (
    <header className="flex w-full items-center justify-between gap-3 border-b border-border bg-app px-4 py-3 sm:px-6 lg:px-8">
      <Link
        className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-muted transition hover:bg-panel-muted hover:text-text"
        href="/"
      >
        <Image
          alt=""
          aria-hidden="true"
          className="h-5 w-5 shrink-0"
          height={20}
          src="/favicon.ico"
          unoptimized
          width={20}
        />
        {copy.common.home}
      </Link>
      <div
        className="relative flex items-center justify-end"
        ref={profileMenuRef}
      >
        <button
          aria-label={copy.common.profile}
          aria-expanded={isProfileMenuOpen}
          aria-haspopup="menu"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-transparent px-2 text-sm font-semibold text-text transition hover:border-border hover:bg-panel-muted active:scale-[0.98]"
          onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
          type="button"
        >
          <span className="relative h-8 w-8 overflow-hidden rounded-full border border-border bg-panel-muted">
            <AvatarImage
              alt={`${user.displayName}'s avatar`}
              className="h-full w-full object-cover"
              sizes="32px"
              src={avatarUrl}
            />
          </span>
          <FaChevronDown
            aria-hidden="true"
            className={`h-3 w-3 text-muted transition ${
              isProfileMenuOpen ? "rotate-180" : ""
            }`}
          />
          <span className="sr-only">{copy.common.profile}</span>
        </button>

        <AnimatePresence>
          {isProfileMenuOpen ? (
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[240px] overflow-hidden rounded-lg border border-border bg-panel text-sm text-text shadow-[var(--shadow-panel)]"
              exit={{ opacity: 0, scale: 0.98, y: -4 }}
              initial={{ opacity: 0, scale: 0.98, y: -4 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-3 border-b border-border px-3 py-3">
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-panel-muted">
                  <AvatarImage
                    alt={`${user.displayName}'s avatar`}
                    className="h-full w-full object-cover"
                    sizes="40px"
                    src={avatarUrl}
                  />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-text">
                    {user.displayName}
                  </p>
                  <p className="truncate text-xs font-semibold text-accent">
                    @{user.username}
                  </p>
                </div>
              </div>

              <div className="grid gap-1 p-2">
                {showProfileShortcut ? (
                  <Link
                    className="flex h-9 items-center gap-2 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-panel-muted hover:text-text"
                    href={profilePath}
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
                    <FaUser aria-hidden="true" className="h-3.5 w-3.5" />
                    <span>{copy.common.profile}</span>
                  </Link>
                ) : null}

                {showThemeControl ? (
                  <div className="grid gap-2 rounded-md px-2 py-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted">
                      {theme === "light" ? (
                        <FaSun aria-hidden="true" className="h-3.5 w-3.5" />
                      ) : (
                        <FaMoon aria-hidden="true" className="h-3.5 w-3.5" />
                      )}
                      <span>{copy.header.theme}</span>
                    </div>
                    <div
                      aria-label={copy.header.theme}
                      className="inline-flex h-10 items-center rounded-md border border-border bg-panel-muted p-1"
                      role="group"
                    >
                      {themeOptions.map((option) => (
                        <button
                          aria-pressed={theme === option.value}
                          className={`h-8 flex-1 rounded px-3 text-xs font-semibold transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                            theme === option.value
                              ? "bg-panel text-text shadow-[0_1px_0_rgb(15_23_42/0.08)]"
                              : "text-muted hover:text-text"
                          }`}
                          disabled={isSavingTheme}
                          key={option.value}
                          onClick={() => onThemeChange(option.value)}
                          type="button"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {themeMessage || themeError ? (
                      <p
                        className={`text-xs font-medium ${
                          themeError ? "text-danger" : "text-muted"
                        }`}
                      >
                        {themeError || themeMessage}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <label className="grid gap-2 rounded-md px-2 py-2 text-xs font-medium text-muted">
                  <span className="flex items-center gap-2">
                    <FaLanguage aria-hidden="true" className="h-3.5 w-3.5" />
                    <span>{copy.common.language}</span>
                  </span>
                  <select
                    className="h-9 rounded-md border border-border bg-panel px-2 text-sm font-semibold text-text outline-none transition focus:border-accent"
                    onChange={(event) =>
                      onLanguageChange(event.target.value as Language)
                    }
                    value={language}
                  >
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value === "vi"
                          ? copy.header.vietnamese
                          : copy.header.english}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="my-1 border-t border-border" />

                {showSignOut ? (
                  <button
                    className="flex h-9 items-center gap-2 rounded-md px-2 text-left text-xs font-medium text-muted transition hover:bg-panel-muted hover:text-text"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onSignOut();
                    }}
                    type="button"
                  >
                    <FaSignOutAlt aria-hidden="true" className="h-3.5 w-3.5" />
                    <span>{copy.common.signOut}</span>
                  </button>
                ) : (
                  <Link
                    className="flex h-9 items-center gap-2 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-panel-muted hover:text-text"
                    href={`/login?next=${encodeURIComponent(profilePath)}`}
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
                    <FaSignInAlt aria-hidden="true" className="h-3.5 w-3.5" />
                    <span>{copy.common.signIn}</span>
                  </Link>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </header>
  );
}
