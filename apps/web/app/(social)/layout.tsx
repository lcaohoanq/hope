import { redirect } from "next/navigation";
import { SocialPageHeader } from "@/components/social/SocialPageHeader";
import { SocialSessionProvider } from "@/components/social/SocialSessionProvider";
import { resolveOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SocialLayout({ children }: { children: React.ReactNode }) {
  const owner = await resolveOwner();
  if (owner.status === "onboarding") redirect("/onboarding");

  if (owner.status === "signed-out") {
    return children;
  }

  return (
    <SocialSessionProvider user={owner.user}>
      <main className="min-h-dvh bg-app text-text">
        <SocialPageHeader user={owner.user} />
        {children}
      </main>
    </SocialSessionProvider>
  );
}
