import { notFound, redirect } from "next/navigation";
import { HopeDashboard } from "@/components/dashboard/HopeDashboard";
import { getCanonicalUserPath } from "@/lib/users";
import { getProfile } from "./profile-page";

type UserPageProps = { params: Promise<{ userSlug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: UserPageProps) {
  const { userSlug } = await params;
  const data = await getProfile(userSlug);
  return {
    title: data ? `${data.profile.displayName} - Hope` : "Không tìm thấy trang | Hope",
  };
}

export default async function UserPage({ params }: UserPageProps) {
  const { userSlug } = await params;
  const data = await getProfile(userSlug);
  if (!data) notFound();

  const canonicalPath = getCanonicalUserPath(data.profile);
  if (`/${userSlug}` !== canonicalPath) redirect(canonicalPath);

  const viewer = data.viewerStatus === "ready" ? (data.viewer ?? undefined) : undefined;

  return (
    <HopeDashboard
      currentTab="overview"
      isAuthenticated={data.viewerStatus !== "signed-out"}
      isEditable={viewer?.id === data.profile.id}
      key={data.profile.id}
      socialSummary={data.social}
      user={data.profile}
      viewer={viewer}
      workoutCount={data.workoutCount}
    />
  );
}
