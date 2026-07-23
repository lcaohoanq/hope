"use client";

import { ProfileSettingsForm } from "@/components/profile/ProfileSettingsForm";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { useSettingsSession } from "@/components/settings/SettingsSessionProvider";

export function SettingsPageContent({
  section,
}: {
  section: "profile" | "account" | "appearance";
}) {
  const user = useSettingsSession();

  if (section === "profile") return <ProfileSettingsForm user={user} />;
  if (section === "appearance") return <AppearanceSettings user={user} />;
  return <AccountSettings user={user} />;
}
