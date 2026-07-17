import { notFound, redirect } from "next/navigation";
import { HopeDashboard } from "@/components/dashboard/HopeDashboard";
import { resolveOwner } from "@/lib/auth";
import { getCanonicalUserPath } from "@/lib/users";
import { getProfile, getWorkoutCount } from "../profile-page";

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

  const owner = await resolveOwner();
  const viewer = owner.status === "ready" ? owner.user : undefined;
  const workoutCount = data.social.canViewWorkouts ? await getWorkoutCount(data.profile.id) : 0;

  return (
    <HopeDashboard
      currentTab="workouts"
      isAuthenticated={owner.status !== "signed-out"}
      isEditable={viewer?.id === data.profile.id}
      key={`${data.profile.id}-workouts`}
      socialSummary={data.social}
      user={data.profile}
      viewer={viewer}
      workoutCount={workoutCount}
    />
  );
}
