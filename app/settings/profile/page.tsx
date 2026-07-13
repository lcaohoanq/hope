import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileSettingsForm } from "@/components/profile/ProfileSettingsForm";
import { resolveOwner } from "@/lib/auth";
import { toPublicUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit profile - Hope",
};

export default async function ProfileSettingsPage() {
  const owner = await resolveOwner();

  if (owner.status === "signed-out") {
    redirect(`/login?next=${encodeURIComponent("/settings/profile")}`);
  }

  if (owner.status === "onboarding") {
    redirect("/onboarding");
  }

  return <ProfileSettingsForm user={toPublicUser(owner.profile)} />;
}
