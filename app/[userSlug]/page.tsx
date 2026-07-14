import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { AppClerkProvider } from "@/components/auth/AppClerkProvider";
import { HopeDashboard } from "@/components/dashboard/HopeDashboard";
import { resolveProfileAccess } from "@/lib/profile-access";
import { getProfileByClerkId, getProfileByPath } from "@/lib/repositories/profiles";
import { getCanonicalUserPath, toPrivateProfileShell, toPublicUser } from "@/lib/users";

type UserPageProps = { params: Promise<{ userSlug: string }> };

const getProfile = cache(getProfileByPath);

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: UserPageProps) {
  const { userSlug } = await params;
  const user = await getProfile(userSlug);
  return {
    title: user ? `${user.displayName} - Hope` : "Không tìm thấy trang | Hope",
  };
}

export default async function UserPage({ params }: UserPageProps) {
  const { userSlug } = await params;
  const user = await getProfile(userSlug);
  if (!user) notFound();

  const canonicalPath = getCanonicalUserPath(user);
  if (`/${userSlug}` !== canonicalPath) redirect(canonicalPath);

  const { userId } = await auth();
  const authenticatedProfile = userId ? await getProfileByClerkId(userId) : undefined;
  const socialSummary = await resolveProfileAccess(user, authenticatedProfile);
  return (
    <AppClerkProvider>
      <HopeDashboard
        isAuthenticated={Boolean(userId)}
        isEditable={authenticatedProfile?.id === user.id}
        key={user.id}
        socialSummary={socialSummary}
        user={socialSummary.canViewWorkouts ? toPublicUser(user) : toPrivateProfileShell(user)}
        viewer={authenticatedProfile ? toPublicUser(authenticatedProfile) : undefined}
      />
    </AppClerkProvider>
  );
}
