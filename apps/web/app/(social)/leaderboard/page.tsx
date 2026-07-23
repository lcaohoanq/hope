import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SocialPageContent } from "@/components/social/SocialPageContent";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login?next=/leaderboard");
  return <SocialPageContent page="leaderboard" />;
}
