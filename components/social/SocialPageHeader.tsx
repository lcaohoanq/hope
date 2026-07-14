import Link from "next/link";
import type { PublicAppUser } from "@/lib/users";

export function SocialPageHeader({ user }: { user: PublicAppUser }) {
  return (
    <header className="border-b border-border bg-app">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link className="font-semibold text-text" href="/">
          Hope
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link className="text-muted hover:text-text" href="/feed">
            Feed
          </Link>
          <Link className="text-muted hover:text-text" href="/notifications">
            Notifications
          </Link>
          <Link className="text-accent" href={`/${user.username}`}>
            @{user.username}
          </Link>
        </nav>
      </div>
    </header>
  );
}
