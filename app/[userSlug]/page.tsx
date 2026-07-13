import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { HopeDashboard } from "@/components/dashboard/HopeDashboard";
import { getProfileByClerkId, getProfileByPath } from "@/lib/repositories/profiles";
import { getCanonicalUserPath, toPublicUser } from "@/lib/users";

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
  return (
    <HopeDashboard
      isAuthenticated={Boolean(userId)}
      isEditable={authenticatedProfile?.id === user.id}
      key={user.id}
      user={toPublicUser(user)}
    />
  );
}
