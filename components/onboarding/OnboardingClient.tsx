"use client";

import { useRouter } from "next/navigation";
import { OnboardingOverlay } from "@/components/onboarding/OnboardingOverlay";
import { apiClient, getApiErrorMessage } from "@/lib/http";
import type { PublicAppUser } from "@/lib/users";
import type { UserProfile } from "@/lib/workout-types";

export function OnboardingClient() {
  const router = useRouter();

  async function createProfile(profile: UserProfile) {
    const fallbackMessage = "Unable to create your profile.";

    try {
      const { data: payload } = await apiClient.post<{
        success: boolean;
        user?: PublicAppUser;
        error?: string;
      }>("/users/profile", profile);
      if (!payload.success || !payload.user) {
        throw new Error(payload.error ?? fallbackMessage);
      }
      router.replace(`/${payload.user.username}`);
      router.refresh();
    } catch (error) {
      throw new Error(getApiErrorMessage(error, fallbackMessage));
    }
  }

  return <OnboardingOverlay currentYear={new Date().getFullYear()} onComplete={createProfile} />;
}
