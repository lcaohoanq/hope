"use client";

import { FeedClient } from "@/components/social/FeedClient";
import { LeaderboardClient } from "@/components/social/LeaderboardClient";
import { NotificationsClient } from "@/components/social/NotificationsClient";
import { useSocialSession } from "@/components/social/SocialSessionProvider";
import { getSocialCopy } from "@/lib/social-copy";

export function SocialPageContent({ page }: { page: "feed" | "leaderboard" | "notifications" }) {
  const user = useSocialSession();
  const copy = getSocialCopy(user.preferredLanguage);

  if (page === "feed") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">{copy.feed}</h1>
        <p className="mt-2 mb-6 text-sm text-muted">{copy.feedDescription}</p>
        <FeedClient language={user.preferredLanguage} viewer={user} />
      </div>
    );
  }

  if (page === "leaderboard") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">{copy.leaderboard}</h1>
        <p className="mt-2 mb-6 text-sm text-muted">{copy.leaderboardDescription}</p>
        <LeaderboardClient language={user.preferredLanguage} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">{copy.notifications}</h1>
      <NotificationsClient language={user.preferredLanguage} />
    </div>
  );
}
