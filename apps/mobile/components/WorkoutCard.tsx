import { useAuth } from "@clerk/clerk-expo";
import type { FeedItem, WorkoutComment } from "@hope/shared";
import { validateCommentBody } from "@hope/shared";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Field, Muted } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { getErrorMessage, getMobileApiClient } from "@/lib/api";

type Props = {
  item: FeedItem;
  onChanged?: () => void;
};

export function WorkoutCard({ item, onChanged }: Props) {
  const { colors } = useTheme();
  const { getToken } = useAuth();
  const [liked, setLiked] = useState(item.viewerHasLiked);
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const [comments, setComments] = useState<WorkoutComment[]>(item.commentsPreview ?? []);
  const [commentCount, setCommentCount] = useState(item.commentCount);
  const [showComments, setShowComments] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggleLike() {
    setBusy(true);
    setError("");
    try {
      const token = await getToken();
      const client = getMobileApiClient(token);
      const res = liked
        ? await client.workouts[":workoutId"].like.$delete({
            param: { workoutId: item.workout.id },
          })
        : await client.workouts[":workoutId"].like.$post({
            param: { workoutId: item.workout.id },
          });
      if (!res.ok) throw new Error("Unable to update like.");
      setLiked(!liked);
      setLikeCount((c) => c + (liked ? -1 : 1));
      onChanged?.();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update like."));
    } finally {
      setBusy(false);
    }
  }

  async function loadComments() {
    setShowComments(true);
    try {
      const token = await getToken();
      const client = getMobileApiClient(token);
      const res = await client.workouts[":workoutId"].comments.$get({
        param: { workoutId: item.workout.id },
        query: {},
      });
      const payload = (await res.json()) as {
        items?: WorkoutComment[];
        comments?: WorkoutComment[];
      };
      setComments(payload.items ?? payload.comments ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load comments."));
    }
  }

  async function submitComment() {
    const validation = validateCommentBody({ body });
    if (!validation.success) {
      setError(validation.error);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const token = await getToken();
      const client = getMobileApiClient(token);
      const res = await client.workouts[":workoutId"].comments.$post({
        param: { workoutId: item.workout.id },
        json: { body: validation.body },
      });
      const payload = (await res.json()) as { success?: boolean; comment?: WorkoutComment };
      if (!res.ok || !payload.comment) throw new Error("Unable to post comment.");
      const comment = payload.comment;
      setComments((prev) => [...prev, comment]);
      setCommentCount((c) => c + 1);
      setBody("");
      onChanged?.();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to post comment."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.border }]}>
      <Link href={`/users/${item.profile.username}`} asChild>
        <Pressable>
          <Text style={[styles.author, { color: colors.text }]}>
            {item.profile.displayName}{" "}
            <Text style={{ color: colors.muted }}>@{item.profile.username}</Text>
          </Text>
        </Pressable>
      </Link>
      <Link href={`/workouts/${item.workout.id}`} asChild>
        <Pressable>
          <Text style={[styles.caption, { color: colors.text }]}>{item.workout.type}</Text>
          <Muted>
            {item.workout.date}
            {item.workout.durationMinutes ? ` · ${item.workout.durationMinutes}m` : ""}
          </Muted>
          {item.workout.note ? (
            <Text style={[styles.caption, { color: colors.text, marginTop: 4 }]}>
              {item.workout.note}
            </Text>
          ) : null}
        </Pressable>
      </Link>
      {item.workout.images?.length ? (
        <View style={styles.images}>
          {item.workout.images.slice(0, 3).map((image) => (
            <Image key={image.src} source={image.src} style={styles.image} contentFit="cover" />
          ))}
        </View>
      ) : null}
      <View style={styles.actions}>
        <Button
          label={liked ? `Liked (${likeCount})` : `Like (${likeCount})`}
          onPress={() => void toggleLike()}
          disabled={busy}
          variant="ghost"
        />
        <Button
          label={`Comments (${commentCount})`}
          onPress={() => void loadComments()}
          variant="ghost"
        />
      </View>
      {showComments ? (
        <View style={{ gap: 8 }}>
          {comments.map((comment) => (
            <Text key={comment.id} style={{ color: colors.text }}>
              <Text style={{ fontWeight: "600" }}>{comment.author.displayName}: </Text>
              {comment.body}
            </Text>
          ))}
          <Field label="Add comment" value={body} onChangeText={setBody} />
          <Button label="Post" onPress={() => void submitComment()} disabled={busy} />
        </View>
      ) : null}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 },
  author: { fontSize: 15, fontWeight: "600" },
  caption: { fontSize: 16, lineHeight: 22 },
  images: { flexDirection: "row", gap: 6 },
  image: { width: 96, height: 96, borderRadius: 8 },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
});
