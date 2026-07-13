import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OnboardingClient } from "@/components/onboarding/OnboardingClient";
import { getProfileByClerkId } from "@/lib/repositories/profiles";
import { getCanonicalUserPath } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");
  const profile = await getProfileByClerkId(userId);
  if (profile) redirect(getCanonicalUserPath(profile));
  return <OnboardingClient />;
}
