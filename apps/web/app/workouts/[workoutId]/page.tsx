import Link from "next/link";
import { notFound } from "next/navigation";
import { SocialPageHeader } from "@/components/social/SocialPageHeader";
import { WorkoutSocialCard } from "@/components/social/WorkoutSocialCard";
import { getServerApiClient } from "@/lib/api";
import { resolveOwner } from "@/lib/auth";
import { getSocialCopy } from "@/lib/social-copy";

export const dynamic = "force-dynamic";

type WorkoutPostPageProps = { params: Promise<{ workoutId: string }> };

export default async function WorkoutPostPage({ params }: WorkoutPostPageProps) {
  const { workoutId } = await params;
  const owner = await resolveOwner();
  const viewer = owner.status === "ready" ? owner.user : undefined;

  const client = await getServerApiClient();
  const [postRes, commentsRes] = await Promise.all([
    client.workouts[":workoutId"].$get({ param: { workoutId } }),
    client.workouts[":workoutId"].comments.$get({ param: { workoutId }, query: {} }),
  ]);
  if (!postRes.ok) notFound();
  if (!commentsRes.ok) notFound();

  const postData = await postRes.json();
  const commentsData = await commentsRes.json();
  if (!("status" in postData) || postData.status !== "ready") notFound();
  if (!("status" in commentsData) || commentsData.status !== "ready") notFound();

  const post = postData;
  const comments = commentsData;

  const language = viewer?.preferredLanguage ?? post.item.profile.preferredLanguage;
  const copy = getSocialCopy(language);

  return (
    <main className="min-h-dvh bg-app text-text">
      <SocialPageHeader language={language} user={viewer} />
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          className="mb-4 inline-flex text-sm font-semibold text-muted transition hover:text-accent"
          href={viewer ? "/feed" : `/${post.item.profile.username}`}
        >
          {viewer ? `← ${copy.feed}` : `← @${post.item.profile.username}`}
        </Link>
        <WorkoutSocialCard
          detail
          initialComments={comments.items}
          initialCommentsCursor={comments.nextCursor}
          item={post.item}
          language={language}
          viewer={viewer}
        />
      </div>
    </main>
  );
}
