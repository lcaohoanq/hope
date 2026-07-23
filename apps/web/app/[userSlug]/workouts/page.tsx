import { notFound, redirect } from "next/navigation";
import { HopeDashboard } from "@/components/dashboard/HopeDashboard";
import { getCanonicalUserPath } from "@/lib/users";
import { getProfile } from "../profile-page";

type WorkoutsPageProps = { params: Promise<{ userSlug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: WorkoutsPageProps) {
  const { userSlug } = await params;
  const data = await getProfile(userSlug);
  if (!data) {
    return { title: "Không tìm thấy trang | Hope" };
  }
  return {
    title: `${data.profile.displayName} · Workouts - Hope`,
  };
}

export default async function UserWorkoutsPage({ params }: WorkoutsPageProps) {
  const { userSlug } = await params;
  const data = await getProfile(userSlug);
  if (!data) notFound();

  const canonicalPath = getCanonicalUserPath(data.profile);
  if (`/${userSlug}` !== canonicalPath) redirect(`${canonicalPath}/workouts`);

  const viewer = data.viewerStatus === "ready" ? (data.viewer ?? undefined) : undefined;

  return (
    <HopeDashboard
      currentTab="workouts"
      isAuthenticated={data.viewerStatus !== "signed-out"}
      isEditable={viewer?.id === data.profile.id}
      key={`${data.profile.id}-workouts`}
      socialSummary={data.social}
      user={data.profile}
      viewer={viewer}
      workoutCount={data.workoutCount}
    />
  );
}
