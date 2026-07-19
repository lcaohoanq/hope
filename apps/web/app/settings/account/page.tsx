import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { resolveOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Account settings - Hope" };

export default async function AccountSettingsPage() {
  const owner = await resolveOwner();
  if (owner.status === "signed-out")
    redirect(`/login?next=${encodeURIComponent("/settings/account")}`);
  if (owner.status === "onboarding") redirect("/onboarding");
  return (
    <SettingsShell section="account" user={owner.user}>
      <AccountSettings user={owner.user} />
    </SettingsShell>
  );
}
