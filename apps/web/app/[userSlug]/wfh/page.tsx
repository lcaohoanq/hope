import { notFound, redirect } from "next/navigation";
import { HopeDashboard } from "@/components/dashboard/HopeDashboard";
import { getCanonicalUserPath } from "@/lib/users";
import { getProfile } from "../profile-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "WFH · Hope", robots: { index: false, follow: false } };

export default async function WfhPage({ params }: { params: Promise<{ userSlug: string }> }) {
  const { userSlug } = await params;
  const data = await getProfile(userSlug);
  if (data?.viewerStatus !== "ready" || data.viewer?.id !== data.profile.id) notFound();
  const canonicalPath = getCanonicalUserPath(data.profile);
  if (`/${userSlug}` !== canonicalPath) redirect(`${canonicalPath}/wfh`);
  return (
    <HopeDashboard
      currentTab="wfh"
      isAuthenticated
      isEditable
      user={data.profile}
      viewer={data.viewer}
      socialSummary={data.social}
      workoutCount={data.workoutCount}
    />
  );
}
