import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { resolveOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings - Hope",
};

export default async function SettingsPage() {
  const owner = await resolveOwner();
  if (owner.status === "signed-out") {
    redirect(`/login?next=${encodeURIComponent("/settings")}`);
  }
  if (owner.status === "onboarding") {
    redirect("/onboarding");
  }
  return <SettingsClient user={owner.user} />;
}
