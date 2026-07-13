import { redirect } from "next/navigation";
import { resolveOwner } from "@/lib/auth";
import { toPublicUser } from "@/lib/users";
import { getSocialCopy } from "@/lib/social-copy";
import { NotificationsClient } from "@/components/social/NotificationsClient";
import { SocialPageHeader } from "@/components/social/SocialPageHeader";

export const dynamic = "force-dynamic";
export default async function NotificationsPage() {
  const owner = await resolveOwner();
  if (owner.status === "signed-out") redirect("/login?next=/notifications");
  if (owner.status === "onboarding") redirect("/onboarding");
  const user = toPublicUser(owner.profile); const copy = getSocialCopy(user.preferredLanguage);
  return <main className="min-h-dvh bg-app text-text"><SocialPageHeader user={user} /><div className="mx-auto max-w-2xl px-4 py-8 sm:px-6"><h1 className="mb-6 text-3xl font-semibold tracking-tight">{copy.notifications}</h1><NotificationsClient language={user.preferredLanguage} /></div></main>;
}
