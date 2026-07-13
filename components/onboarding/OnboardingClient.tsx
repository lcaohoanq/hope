"use client";

import { useRouter } from "next/navigation";
import { OnboardingOverlay } from "@/components/onboarding/OnboardingOverlay";
import type { PublicAppUser } from "@/lib/users";
import type { UserProfile } from "@/lib/workout-types";

export function OnboardingClient() {
  const router = useRouter();

  async function createProfile(profile: UserProfile) {
    const response = await fetch("/api/users/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const payload = (await response.json()) as { success: boolean; user?: PublicAppUser; error?: string };
    if (!response.ok || !payload.success || !payload.user) {
      throw new Error(payload.error ?? "Unable to create your profile.");
    }
    router.replace(`/${payload.user.username}`);
    router.refresh();
  }

  return <OnboardingOverlay currentYear={new Date().getFullYear()} onComplete={createProfile} />;
}
