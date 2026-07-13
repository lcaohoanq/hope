import { ConnectionsPage } from "@/components/social/ConnectionsPage";
export const dynamic = "force-dynamic";
export default async function FollowingPage({ params }: { params: Promise<{ userSlug: string }> }) { const { userSlug } = await params; return <ConnectionsPage type="following" userSlug={userSlug} />; }
