import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerApiClient } from "@/lib/api";
import { getSocialCopy } from "@/lib/social-copy";
import { ConnectionsPageClient } from "./ConnectionsPageClient";

export async function ConnectionsPage({
  userSlug,
  type,
}: {
  userSlug: string;
  type: "followers" | "following";
}) {
  const client = await getServerApiClient();
  const res = await client.profiles["by-username"][":username"].$get({
    param: { username: userSlug },
  });
  if (!res.ok) notFound();
  const data = await res.json();
  if (!data.success) notFound();

  const viewer = data.viewerStatus === "ready" ? (data.viewer ?? undefined) : undefined;
  const copy = getSocialCopy(viewer?.preferredLanguage ?? data.profile.preferredLanguage);
  return (
    <main className="min-h-dvh bg-app text-text">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link className="text-sm font-semibold text-accent" href={`/${data.profile.username}`}>
          ← @{data.profile.username}
        </Link>
        <h1 className="my-6 text-3xl font-semibold">
          {type === "followers" ? copy.followers : copy.following}
        </h1>
        <ConnectionsPageClient
          canView={data.social.canViewConnections}
          language={viewer?.preferredLanguage ?? data.profile.preferredLanguage}
          profileId={data.profile.id}
          type={type}
        />
      </div>
    </main>
  );
}
