"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { FaHeart, FaPaperPlane, FaPen, FaRegComment, FaRegHeart, FaTrash } from "react-icons/fa";
import { AvatarImage } from "@/components/dashboard/AvatarImage";
import type { Language } from "@/lib/i18n";
import { getAvatarUrl } from "@/lib/profile-utils";
import { getSocialCopy } from "@/lib/social-copy";
import type { FeedItem, WorkoutComment } from "@/lib/social-types";
import type { PublicAppUser } from "@/lib/users";
import { WorkoutImageGallery } from "./WorkoutImageGallery";

type WorkoutSocialCardProps = {
  item: FeedItem;
  language: Language;
  viewer?: PublicAppUser;
  detail?: boolean;
  initialComments?: WorkoutComment[];
  initialCommentsCursor?: string | null;
};

type ApiError = { error?: string };

async function readError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as ApiError;
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

export function WorkoutSocialCard({
  item,
  language,
  viewer,
  detail = false,
  initialComments,
  initialCommentsCursor = null,
}: WorkoutSocialCardProps) {
  const copy = getSocialCopy(language);
  const [liked, setLiked] = useState(item.viewerHasLiked);
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const [commentCount, setCommentCount] = useState(item.commentCount);
  const [comments, setComments] = useState(initialComments ?? item.commentsPreview);
  const [commentsCursor, setCommentsCursor] = useState(initialCommentsCursor);
  const [commentBody, setCommentBody] = useState("");
  const [likePending, setLikePending] = useState(false);
  const [commentPending, setCommentPending] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [error, setError] = useState("");
  const workoutUrl = `/workouts/${item.workout.id}`;

  async function toggleLike() {
    if (!viewer || likePending) return;
    const previousLiked = liked;
    const previousCount = likeCount;
    const nextLiked = !previousLiked;
    setLiked(nextLiked);
    setLikeCount(Math.max(0, previousCount + (nextLiked ? 1 : -1)));
    setLikePending(true);
    setError("");
    try {
      const response = await fetch(`/api/workouts/${item.workout.id}/like`, {
        method: nextLiked ? "POST" : "DELETE",
      });
      if (!response.ok) throw new Error(await readError(response, copy.interactionFailed));
      const payload = (await response.json()) as {
        likeCount: number;
        viewerHasLiked: boolean;
      };
      setLiked(payload.viewerHasLiked);
      setLikeCount(payload.likeCount);
    } catch (caught) {
      setLiked(previousLiked);
      setLikeCount(previousCount);
      setError(caught instanceof Error ? caught.message : copy.interactionFailed);
    } finally {
      setLikePending(false);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!viewer || commentPending) return;
    const body = commentBody.trim();
    if (!body) return;
    if (body.length > 500) {
      setError(copy.commentTooLong);
      return;
    }
    const temporaryId = `pending-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const optimistic: WorkoutComment = {
      id: temporaryId,
      workoutId: item.workout.id,
      author: viewer,
      body,
      createdAt: now,
      updatedAt: now,
      viewerCanEdit: true,
      viewerCanDelete: true,
    };
    const previousComments = comments;
    setComments([...comments, optimistic]);
    setCommentCount((value) => value + 1);
    setCommentBody("");
    setCommentPending(true);
    setError("");
    try {
      const response = await fetch(`/api/workouts/${item.workout.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!response.ok) throw new Error(await readError(response, copy.interactionFailed));
      const payload = (await response.json()) as { comment: WorkoutComment };
      setComments((current) =>
        current.map((comment) => (comment.id === temporaryId ? payload.comment : comment)),
      );
    } catch (caught) {
      setComments(previousComments);
      setCommentCount((value) => Math.max(0, value - 1));
      setCommentBody(body);
      setError(caught instanceof Error ? caught.message : copy.interactionFailed);
    } finally {
      setCommentPending(false);
    }
  }

  async function updateComment(commentId: string, body: string) {
    const previous = comments;
    setComments((current) =>
      current.map((comment) =>
        comment.id === commentId
          ? { ...comment, body, updatedAt: new Date().toISOString() }
          : comment,
      ),
    );
    setError("");
    const response = await fetch(`/api/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (!response.ok) {
      setComments(previous);
      const message = await readError(response, copy.interactionFailed);
      setError(message);
      throw new Error(message);
    }
    const payload = (await response.json()) as { comment: WorkoutComment };
    setComments((current) =>
      current.map((comment) => (comment.id === commentId ? payload.comment : comment)),
    );
  }

  async function deleteComment(commentId: string) {
    const previous = comments;
    setComments((current) => current.filter((comment) => comment.id !== commentId));
    setCommentCount((value) => Math.max(0, value - 1));
    setError("");
    const response = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (!response.ok) {
      setComments(previous);
      setCommentCount((value) => value + 1);
      setError(await readError(response, copy.interactionFailed));
    }
  }

  async function loadEarlierComments() {
    if (!commentsCursor || commentsLoading) return;
    setCommentsLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/workouts/${item.workout.id}/comments?cursor=${encodeURIComponent(commentsCursor)}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error(await readError(response, copy.interactionFailed));
      const payload = (await response.json()) as {
        items: WorkoutComment[];
        nextCursor: string | null;
      };
      setComments((current) => [...payload.items, ...current]);
      setCommentsCursor(payload.nextCursor);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.interactionFailed);
    } finally {
      setCommentsLoading(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-panel shadow-[var(--shadow-panel)]">
      <header className="flex items-center gap-3 p-4 sm:p-5">
        <Link
          aria-label={item.profile.displayName}
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border bg-panel-muted"
          href={`/${item.profile.username}`}
        >
          <AvatarImage
            alt={item.profile.displayName}
            className="h-full w-full object-cover"
            sizes="44px"
            src={item.profile.avatarUrl ?? getAvatarUrl(item.profile.avatarSeed)}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            className="truncate text-sm font-semibold text-text hover:text-accent"
            href={`/${item.profile.username}`}
          >
            {item.profile.displayName}
          </Link>
          <p className="truncate text-xs text-muted">
            @{item.profile.username} <span aria-hidden="true">·</span> {item.workout.date}
          </p>
        </div>
        {!detail ? (
          <Link
            className="shrink-0 text-xs font-semibold text-accent hover:underline"
            href={workoutUrl}
          >
            {copy.viewWorkout}
          </Link>
        ) : null}
      </header>

      {item.workout.images?.length ? (
        <WorkoutImageGallery
          authorName={item.profile.displayName}
          eagerFirstImage={detail}
          images={item.workout.images}
          language={language}
          workoutType={item.workout.type}
        />
      ) : null}

      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {detail ? (
              <h1 className="text-xl font-semibold text-text">{item.workout.type}</h1>
            ) : (
              <h2 className="font-semibold text-text">{item.workout.type}</h2>
            )}
            {item.workout.durationMinutes > 0 ? (
              <p className="mt-1 text-sm text-muted">{item.workout.durationMinutes} min</p>
            ) : null}
          </div>
        </div>
        {item.workout.note ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text">
            {item.workout.note}
          </p>
        ) : null}

        <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
          <button
            aria-label={liked ? copy.unlike : copy.like}
            aria-pressed={liked}
            className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed ${
              liked
                ? "bg-danger-soft text-danger"
                : "text-muted hover:bg-panel-muted hover:text-text"
            }`}
            disabled={!viewer || likePending}
            onClick={() => void toggleLike()}
            type="button"
          >
            {liked ? <FaHeart aria-hidden="true" /> : <FaRegHeart aria-hidden="true" />}
            <span>{likeCount}</span>
          </button>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-muted transition hover:bg-panel-muted hover:text-text active:scale-[0.98]"
            href={`${workoutUrl}#comments`}
          >
            <FaRegComment aria-hidden="true" />
            <span>{commentCount}</span>
          </Link>
        </div>

        <section aria-label={copy.comments} className="mt-3" id={detail ? "comments" : undefined}>
          {detail && commentsCursor ? (
            <button
              className="mb-3 text-xs font-semibold text-accent hover:underline disabled:text-muted"
              disabled={commentsLoading}
              onClick={() => void loadEarlierComments()}
              type="button"
            >
              {commentsLoading ? `${copy.loadEarlierComments}...` : copy.loadEarlierComments}
            </button>
          ) : null}
          <div className="grid gap-3">
            {comments.map((comment) => (
              <CommentRow
                comment={comment}
                copy={copy}
                key={comment.id}
                onDelete={deleteComment}
                onUpdate={updateComment}
              />
            ))}
          </div>
          {!detail && commentCount > comments.length ? (
            <Link
              className="mt-3 inline-block text-xs font-semibold text-accent hover:underline"
              href={`${workoutUrl}#comments`}
            >
              {copy.viewAllComments(commentCount)}
            </Link>
          ) : null}
          {viewer ? (
            <form className="mt-4 flex items-end gap-2" onSubmit={submitComment}>
              <label className="min-w-0 flex-1">
                <span className="sr-only">{copy.commentPlaceholder}</span>
                <textarea
                  aria-describedby={error ? `workout-${item.workout.id}-error` : undefined}
                  className="min-h-10 w-full resize-none rounded-md border border-border bg-app px-3 py-2 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
                  maxLength={500}
                  onChange={(event) => setCommentBody(event.target.value)}
                  placeholder={copy.commentPlaceholder}
                  rows={1}
                  value={commentBody}
                />
              </label>
              <button
                aria-label={copy.postComment}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent text-accent-contrast transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={commentPending || !commentBody.trim()}
                type="submit"
              >
                <FaPaperPlane aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : detail ? (
            <p className="mt-4 text-sm text-muted">
              <Link
                className="font-semibold text-accent hover:underline"
                href={`/login?next=${encodeURIComponent(workoutUrl)}`}
              >
                {copy.signInToInteract}
              </Link>
            </p>
          ) : null}
          {error ? (
            <p
              aria-live="polite"
              className="mt-2 text-xs font-medium text-danger"
              id={`workout-${item.workout.id}-error`}
            >
              {error}
            </p>
          ) : null}
        </section>
      </div>
    </article>
  );
}

type SocialCopy = ReturnType<typeof getSocialCopy>;

function CommentRow({
  comment,
  copy,
  onDelete,
  onUpdate,
}: {
  comment: WorkoutComment;
  copy: SocialCopy;
  onDelete: (commentId: string) => Promise<void>;
  onUpdate: (commentId: string, body: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const [saving, setSaving] = useState(false);

  async function save() {
    const value = body.trim();
    if (!value || value.length > 500 || saving) return;
    setSaving(true);
    try {
      await onUpdate(comment.id, value);
      setEditing(false);
    } catch {
      // The parent restores the previous comment and renders the API error.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-2.5" id={`comment-${comment.id}`}>
      <Link
        aria-label={comment.author.displayName}
        className="relative mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-panel-muted"
        href={`/${comment.author.username}`}
      >
        <AvatarImage
          alt={comment.author.displayName}
          className="h-full w-full object-cover"
          sizes="32px"
          src={comment.author.avatarUrl ?? getAvatarUrl(comment.author.avatarSeed)}
        />
      </Link>
      <div className="min-w-0 flex-1 rounded-md bg-panel-muted px-3 py-2">
        <div className="flex items-start justify-between gap-3">
          <Link
            className="truncate text-xs font-semibold text-text hover:text-accent"
            href={`/${comment.author.username}`}
          >
            {comment.author.displayName}
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            {comment.viewerCanEdit ? (
              <button
                aria-label={copy.editComment}
                className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-panel hover:text-text"
                onClick={() => setEditing((value) => !value)}
                type="button"
              >
                <FaPen aria-hidden="true" className="h-2.5 w-2.5" />
              </button>
            ) : null}
            {comment.viewerCanDelete ? (
              <button
                aria-label={copy.deleteComment}
                className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-danger-soft hover:text-danger"
                onClick={() => void onDelete(comment.id)}
                type="button"
              >
                <FaTrash aria-hidden="true" className="h-2.5 w-2.5" />
              </button>
            ) : null}
          </div>
        </div>
        {editing ? (
          <div className="mt-2">
            <label>
              <span className="sr-only">{copy.editComment}</span>
              <textarea
                className="min-h-20 w-full resize-y rounded-md border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                maxLength={500}
                onChange={(event) => setBody(event.target.value)}
                value={body}
              />
            </label>
            <div className="mt-2 flex gap-2">
              <button
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-contrast disabled:opacity-50"
                disabled={saving || !body.trim()}
                onClick={() => void save()}
                type="button"
              >
                {copy.saveComment}
              </button>
              <button
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted"
                onClick={() => {
                  setBody(comment.body);
                  setEditing(false);
                }}
                type="button"
              >
                {copy.cancel}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-text">
            {comment.body}
          </p>
        )}
        {comment.updatedAt !== comment.createdAt ? (
          <p className="mt-1 text-[11px] text-muted">{copy.edited}</p>
        ) : null}
      </div>
    </div>
  );
}
