import { redirect } from "next/navigation";
import { OnboardingClient } from "@/components/onboarding/OnboardingClient";
import { resolveOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const owner = await resolveOwner();
  if (owner.status === "signed-out") redirect("/login");
  if (owner.status === "ready") redirect(`/${owner.user.username}`);
  return <OnboardingClient />;
}
