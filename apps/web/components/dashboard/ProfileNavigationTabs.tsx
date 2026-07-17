"use client";

import type { AppCopy } from "@/lib/i18n";

type ProfileNavigationTabsProps = {
  username: string;
  workoutCount: number;
  currentTab: "overview" | "workouts";
  copy: AppCopy;
};

export function ProfileNavigationTabs({
  username,
  workoutCount,
  currentTab,
  copy,
}: ProfileNavigationTabsProps) {
  const tabs = [
    {
      id: "overview" as const,
      label: copy.navigation.overview,
      href: `/${username}`,
      badge: null,
    },
    {
      id: "workouts" as const,
      label: copy.navigation.workouts,
      href: `/${username}`,
      badge: workoutCount,
    },
  ];

  return (
    <nav
      aria-label="Profile navigation"
      className="border-b border-border bg-app sticky top-0 z-10"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <a
                key={tab.id}
                href={tab.href}
                className={`
                  flex items-center gap-2 py-3 px-1 border-b-2 transition-colors whitespace-nowrap
                  ${
                    isActive
                      ? "border-accent text-text font-semibold"
                      : "border-transparent text-muted hover:text-text hover:border-border"
                  }
                `}
                aria-current={isActive ? "page" : undefined}
              >
                <span>{tab.label}</span>
                {tab.badge !== null && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full bg-panel-muted text-text min-w-[1.5rem]">
                    {tab.badge}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
