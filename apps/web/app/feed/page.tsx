import { redirect } from "next/navigation";
import { FeedClient } from "@/components/social/FeedClient";
import { SocialPageHeader } from "@/components/social/SocialPageHeader";
import { resolveOwner } from "@/lib/auth";
import { getSocialCopy } from "@/lib/social-copy";

export const dynamic = "force-dynamic";
export default async function FeedPage() {
  const owner = await resolveOwner();
  if (owner.status === "signed-out") redirect("/login?next=/feed");
  if (owner.status === "onboarding") redirect("/onboarding");
  const user = owner.user;
  const copy = getSocialCopy(user.preferredLanguage);
  return (
    <main className="min-h-dvh bg-app text-text">
      <SocialPageHeader user={user} />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">{copy.feed}</h1>
        <p className="mt-2 mb-6 text-sm text-muted">{copy.feedDescription}</p>
        <FeedClient language={user.preferredLanguage} viewer={user} />
      </div>
    </main>
  );
}
