import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { resolveOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Appearance settings - Hope" };

export default async function AppearanceSettingsPage() {
  const owner = await resolveOwner();
  if (owner.status === "signed-out")
    redirect(`/login?next=${encodeURIComponent("/settings/appearance")}`);
  if (owner.status === "onboarding") redirect("/onboarding");
  return (
    <SettingsShell section="appearance" user={owner.user}>
      <AppearanceSettings user={owner.user} />
    </SettingsShell>
  );
}
