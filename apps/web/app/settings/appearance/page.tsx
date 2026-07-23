import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsPageContent } from "@/components/settings/SettingsPageContent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Appearance settings - Hope" };

export default async function AppearanceSettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect(`/login?next=${encodeURIComponent("/settings/appearance")}`);
  return <SettingsPageContent section="appearance" />;
}
