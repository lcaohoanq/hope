import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsPageContent } from "@/components/settings/SettingsPageContent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit profile - Hope",
};

export default async function ProfileSettingsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect(`/login?next=${encodeURIComponent("/settings/profile")}`);
  }
  return <SettingsPageContent section="profile" />;
}
