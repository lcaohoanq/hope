import { ConnectionsPage } from "@/components/social/ConnectionsPage";
export const dynamic = "force-dynamic";
export default async function FollowersPage({ params }: { params: Promise<{ userSlug: string }> }) {
  const { userSlug } = await params;
  return <ConnectionsPage type="followers" userSlug={userSlug} />;
}
