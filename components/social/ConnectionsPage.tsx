import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfileByClerkId, getProfileByPath } from "@/lib/repositories/profiles";
import { resolveProfileAccess } from "@/lib/profile-access";
import { getSocialCopy } from "@/lib/social-copy";
import { ConnectionsPageClient } from "./ConnectionsPageClient";

export async function ConnectionsPage({ userSlug, type }: { userSlug: string; type: "followers" | "following" }) {
  const target = await getProfileByPath(userSlug); if (!target) notFound();
  const { userId } = await auth(); const viewer = userId ? await getProfileByClerkId(userId) : undefined;
  const access = await resolveProfileAccess(target, viewer); const copy = getSocialCopy(viewer?.preferredLanguage ?? target.preferredLanguage);
  return <main className="min-h-dvh bg-app text-text"><div className="mx-auto max-w-2xl px-4 py-8 sm:px-6"><Link className="text-sm font-semibold text-accent" href={`/${target.username}`}>← @{target.username}</Link><h1 className="my-6 text-3xl font-semibold">{type === "followers" ? copy.followers : copy.following}</h1><ConnectionsPageClient canView={access.canViewConnections} language={viewer?.preferredLanguage ?? target.preferredLanguage} profileId={target.id} type={type} /></div></main>;
}
