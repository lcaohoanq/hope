"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  FaChevronDown,
  FaCog,
  FaSignInAlt,
  FaSignOutAlt,
  FaTrophy,
  FaUser,
  FaUsers,
} from "react-icons/fa";
import { UserSearch } from "@/components/shared/UserSearch";
import { NotificationBell } from "@/components/social/NotificationBell";
import type { AppCopy, Language } from "@/lib/i18n";
import { getSocialCopy } from "@/lib/social-copy";
import type { PublicAppUser } from "@/lib/users";
import AppLogo from "../shared/AppLogo";
import { AvatarImage } from "./AvatarImage";

type TopHeaderProps = {
  avatarUrl: string;
  copy: AppCopy;
  language: Language;
  onSignOut: () => void;
  showProfileShortcut: boolean;
  showSignOut: boolean;
  user: PublicAppUser;
  showNotifications: boolean;
  showSettings: boolean;
};

export function TopHeader({
  avatarUrl,
  copy,
  language,
  onSignOut,
  showProfileShortcut,
  showSignOut,
  user,
  showNotifications,
  showSettings,
}: TopHeaderProps) {
  const profilePath = `/${user.username}`;
  const socialCopy = getSocialCopy(language);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
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
    <header className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-border bg-app px-4 py-3 sm:px-6 lg:flex-nowrap lg:px-8">
      <Link
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold text-muted transition hover:bg-panel-muted hover:text-text"
        href="/"
      >
        <AppLogo />
        {copy.common.home}
      </Link>
      {!showSignOut ? (
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-accent-contrast transition hover:bg-accent/90 active:scale-[0.98]"
          href={`/login?next=${encodeURIComponent(profilePath)}`}
        >
          <FaSignInAlt aria-hidden="true" className="h-3.5 w-3.5" />
          <span>{copy.common.signIn}</span>
        </Link>
      ) : (
        <>
          <UserSearch
            className="order-3 w-full sm:order-none sm:min-w-[220px] sm:max-w-xs sm:flex-1 lg:max-w-sm"
            copy={{
              error: copy.header.searchError,
              loading: copy.header.searchLoading,
              noResults: copy.header.searchNoResults,
              placeholder: copy.header.searchPlaceholder,
            }}
          />
          <div className="flex shrink-0 items-center justify-end gap-1">
            {showNotifications ? (
              <Link
                aria-label={socialCopy.feed}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-transparent px-3 text-sm font-semibold text-muted transition hover:bg-panel-muted hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.98]"
                href="/feed"
              >
                <FaUsers aria-hidden="true" className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{socialCopy.feed}</span>
              </Link>
            ) : null}
            {showNotifications ? (
              <Link
                aria-label={socialCopy.leaderboard}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-transparent px-3 text-sm font-semibold text-muted transition hover:bg-panel-muted hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.98]"
                href="/leaderboard"
              >
                <FaTrophy aria-hidden="true" className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{socialCopy.leaderboard}</span>
              </Link>
            ) : null}
            {showNotifications ? <NotificationBell language={language} /> : null}
            <div className="relative" ref={profileMenuRef}>
              <button
                aria-label={copy.common.profile}
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="menu"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-transparent px-2 text-sm font-semibold text-text transition hover:bg-panel-muted active:scale-[0.98]"
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
                  className={`h-3 w-3 text-muted transition ${isProfileMenuOpen ? "rotate-180" : ""}`}
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
                        <p className="truncate text-sm font-bold text-text">{user.displayName}</p>
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

                      {showSettings ? (
                        <Link
                          className="flex h-9 items-center gap-2 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-panel-muted hover:text-text"
                          href="/settings"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <FaCog aria-hidden="true" className="h-3.5 w-3.5" />
                          <span>{copy.common.settings}</span>
                        </Link>
                      ) : null}

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
          </div>
        </>
      )}
    </header>
  );
}
