import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SocialPageContent } from "@/components/social/SocialPageContent";

export const dynamic = "force-dynamic";
export default async function FeedPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login?next=/feed");
  return <SocialPageContent page="feed" />;
}
