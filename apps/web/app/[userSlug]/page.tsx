import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { HopeDashboard } from "@/components/dashboard/HopeDashboard";
import { getServerApiClient } from "@/lib/api";
import { resolveOwner } from "@/lib/auth";
import { getCanonicalUserPath } from "@/lib/users";

type UserPageProps = { params: Promise<{ userSlug: string }> };

export const dynamic = "force-dynamic";

async function fetchProfile(username: string) {
  const client = await getServerApiClient();
  const res = await client.profiles["by-username"][":username"].$get({ param: { username } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.success) return null;
  return data;
}

const getProfile = cache(fetchProfile);

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

  const owner = await resolveOwner();
  const viewer = owner.status === "ready" ? owner.user : undefined;
  return (
    <HopeDashboard
      isAuthenticated={owner.status !== "signed-out"}
      isEditable={viewer?.id === data.profile.id}
      key={data.profile.id}
      socialSummary={data.social}
      user={data.profile}
      viewer={viewer}
    />
  );
}
