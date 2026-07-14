import Image from "next/image";
import Link from "next/link";
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
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link className="font-semibold text-text flex items-center gap-2" href="/">
          <AppLogo />
          Hope
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          {user ? (
            <>
              <Link className="text-muted hover:text-text" href="/feed">
                {copy.feed}
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
