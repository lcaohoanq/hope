import { redirect } from "next/navigation";
import { SettingsSessionProvider } from "@/components/settings/SettingsSessionProvider";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { resolveOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const owner = await resolveOwner();
  if (owner.status === "onboarding") redirect("/onboarding");

  if (owner.status === "signed-out") {
    return children;
  }

  return (
    <SettingsSessionProvider user={owner.user}>
      <SettingsShell user={owner.user}>{children}</SettingsShell>
    </SettingsSessionProvider>
  );
}
