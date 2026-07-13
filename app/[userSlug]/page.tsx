import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { HopeDashboard } from "@/components/dashboard/HopeDashboard";
import { getProfileByClerkId, getProfileByPath } from "@/lib/repositories/profiles";
import { getCanonicalUserPath, toPrivateProfileShell, toPublicUser } from "@/lib/users";
import { resolveProfileAccess } from "@/lib/profile-access";

type UserPageProps = { params: Promise<{ userSlug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: UserPageProps) {
  const { userSlug } = await params;
  const user = await getProfileByPath(userSlug);
  return { title: user ? `${user.displayName} - Hope` : "Hope" };
}

export default async function UserPage({ params }: UserPageProps) {
  const { userSlug } = await params;
  const user = await getProfileByPath(userSlug);
  if (!user) notFound();

  const canonicalPath = getCanonicalUserPath(user);
  if (`/${userSlug}` !== canonicalPath) redirect(canonicalPath);

  const { userId } = await auth();
  const authenticatedProfile = userId ? await getProfileByClerkId(userId) : undefined;
  const socialSummary = await resolveProfileAccess(user, authenticatedProfile);
  return (
    <HopeDashboard
      isAuthenticated={Boolean(userId)}
      isEditable={authenticatedProfile?.id === user.id}
      key={user.id}
      socialSummary={socialSummary}
      user={socialSummary.canViewWorkouts ? toPublicUser(user) : toPrivateProfileShell(user)}
      viewer={authenticatedProfile ? toPublicUser(authenticatedProfile) : undefined}
    />
  );
}
