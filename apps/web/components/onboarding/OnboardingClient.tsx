"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { OnboardingOverlay } from "@/components/onboarding/OnboardingOverlay";
import { getApiErrorMessage, getClientApiClient } from "@/lib/http";
import type { PublicAppUser } from "@/lib/users";
import type { UserProfile } from "@/lib/workout-types";

export function OnboardingClient() {
  const { getToken } = useAuth();
  const router = useRouter();

  async function createProfile(profile: UserProfile) {
    const fallbackMessage = "Unable to create your profile.";

    try {
      const token = await getToken();
      const client = getClientApiClient(token);
      const res = await client.users.profile.$post({ json: profile });
      const payload = (await res.json()) as {
        success: boolean;
        user?: PublicAppUser;
        error?: string;
      };
      if (!payload.success || !payload.user) {
        throw new Error(payload.error ?? fallbackMessage);
      }
      router.replace(`/${payload.user.username}`);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, fallbackMessage));
    }
  }

  return <OnboardingOverlay currentYear={new Date().getFullYear()} onComplete={createProfile} />;
}
