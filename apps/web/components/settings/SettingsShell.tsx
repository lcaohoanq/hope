"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaArrowLeft, FaPalette, FaUserCircle, FaUserEdit } from "react-icons/fa";
import { AvatarImage } from "@/components/dashboard/AvatarImage";
import { translations } from "@/lib/i18n";
import { getAvatarUrl } from "@/lib/profile-utils";
import type { PublicAppUser } from "@/lib/users";

type SettingsSection = "profile" | "account" | "appearance";

const sectionPaths: Record<SettingsSection, string> = {
  profile: "/settings/profile",
  account: "/settings/account",
  appearance: "/settings/appearance",
};

export function SettingsShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: PublicAppUser;
}) {
  const pathname = usePathname();
  const section: SettingsSection = pathname.startsWith("/settings/account")
    ? "account"
    : pathname.startsWith("/settings/appearance")
      ? "appearance"
      : "profile";
  const copy = translations[user.preferredLanguage];
  const items: Array<{ icon: typeof FaUserEdit; id: SettingsSection; label: string }> = [
    { icon: FaUserEdit, id: "profile", label: copy.settings.profile },
    { icon: FaUserCircle, id: "account", label: copy.settings.account },
    { icon: FaPalette, id: "appearance", label: copy.settings.appearance },
  ];

  return (
    <main className="min-h-[100dvh] bg-app text-text">
      <header className="border-b border-border bg-app px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md px-2 text-sm font-semibold text-muted transition hover:bg-panel-muted hover:text-text"
            href={`/${user.username}`}
          >
            <FaArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            {copy.common.profile}
          </Link>
          <span className="h-5 border-l border-border" />
          <h1 className="text-xl font-semibold">{copy.common.settings}</h1>
        </div>
      </header>

      <nav
        aria-label={copy.common.settings}
        className="border-b border-border bg-panel px-4 lg:hidden"
      >
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto py-2 [scrollbar-width:thin]">
          {items.map((item) => (
            <SettingsNavLink active={section === item.id} item={item} key={item.id} />
          ))}
        </div>
      </nav>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8 lg:py-10">
        <aside className="hidden lg:block">
          <div className="sticky top-6">
            <Link
              className="mb-6 flex items-center gap-3 rounded-lg p-2 transition hover:bg-panel-muted"
              href={`/${user.username}`}
            >
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                <AvatarImage
                  alt={`${user.displayName}'s avatar`}
                  className="h-full w-full object-cover"
                  sizes="40px"
                  src={user.avatarUrl ?? getAvatarUrl(user.avatarSeed)}
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-text">
                  {user.displayName}
                </span>
                <span className="block truncate text-xs text-muted">@{user.username}</span>
              </span>
            </Link>
            <div className="grid gap-1">
              {items.map((item) => (
                <SettingsNavLink active={section === item.id} item={item} key={item.id} />
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="mb-6 border-b border-border pb-5">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-text">
              {items.find((item) => item.id === section)?.label}
            </h2>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}

function SettingsNavLink({
  active,
  item,
}: {
  active: boolean;
  item: { icon: typeof FaUserEdit; id: SettingsSection; label: string };
}) {
  const Icon = item.icon;
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
        active
          ? "bg-accent text-accent-contrast"
          : "text-muted hover:bg-panel-muted hover:text-text"
      }`}
      href={sectionPaths[item.id]}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {item.label}
    </Link>
  );
}
