import Link from "next/link";
import { UserSearch } from "@/components/shared/UserSearch";
import type { Language } from "@/lib/i18n";
import { getSocialCopy } from "@/lib/social-copy";
import type { PublicAppUser } from "@/lib/users";
import AppLogo from "../shared/AppLogo";

export function SocialPageHeader({
  user,
  language = user?.preferredLanguage ?? "vi",
}: {
  user?: PublicAppUser;
  language?: Language;
}) {
  const copy = getSocialCopy(language);
  return (
    <header className="border-b border-border bg-app">
      <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:flex-nowrap">
        <Link
          className="font-semibold text-text flex items-center gap-2"
          href={user ? `/${user.username}` : "/"}
        >
          <AppLogo />
          Hope
        </Link>
        {user ? (
          <UserSearch
            className="order-3 w-full sm:order-none sm:min-w-[220px] sm:max-w-xs sm:flex-1"
            copy={{
              error: copy.searchError,
              loading: copy.searchLoading,
              noResults: copy.searchNoResults,
              placeholder: copy.searchPlaceholder,
            }}
          />
        ) : null}
        <nav className="flex shrink-0 items-center gap-4 text-sm font-semibold">
          {user ? (
            <>
              <Link className="text-muted hover:text-text" href="/feed">
                {copy.feed}
              </Link>
              <Link className="text-muted hover:text-text" href="/leaderboard">
                {copy.leaderboard}
              </Link>
              <Link className="text-muted hover:text-text" href="/notifications">
                {copy.notifications}
              </Link>
              <Link className="text-accent" href={`/${user.username}`}>
                @{user.username}
              </Link>
            </>
          ) : (
            <Link className="text-accent" href="/login">
              {copy.signIn}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
