import Link from "next/link";
import { notFound } from "next/navigation";
import { SocialPageHeader } from "@/components/social/SocialPageHeader";
import { WorkoutSocialCard } from "@/components/social/WorkoutSocialCard";
import { resolveOwner } from "@/lib/auth";
import { getWorkoutPost, listWorkoutComments } from "@/lib/repositories/workouts";
import { getSocialCopy } from "@/lib/social-copy";
import { toPublicUser } from "@/lib/users";

export const dynamic = "force-dynamic";

type WorkoutPostPageProps = { params: Promise<{ workoutId: string }> };

export default async function WorkoutPostPage({ params }: WorkoutPostPageProps) {
  const { workoutId } = await params;
  const owner = await resolveOwner();
  const viewer = owner.status === "ready" ? toPublicUser(owner.profile) : undefined;
  const post = await getWorkoutPost(workoutId, viewer?.id);
  if (post.status !== "ready") notFound();
  const comments = await listWorkoutComments(workoutId, viewer?.id);
  if (comments.status !== "ready") notFound();
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
