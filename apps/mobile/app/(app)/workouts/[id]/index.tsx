import type { FeedItem, WorkoutComment } from "@hope/shared";
import { Link, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { LoadingState, Muted, Screen, Title } from "@/components/ui";
import { WorkoutCard } from "@/components/WorkoutCard";
import { useSession } from "@/context/SessionContext";
import { useTheme } from "@/context/ThemeContext";
import { getErrorMessage, getMobileApiClient } from "@/lib/api";
import { useStableGetToken } from "@/lib/useStableGetToken";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const getToken = useStableGetToken();
  const { user } = useSession();
  const { colors } = useTheme();
  const [item, setItem] = useState<FeedItem | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const token = await getToken();
        const client = getMobileApiClient(token);
        const [workoutRes, commentsRes] = await Promise.all([
          client.workouts[":workoutId"].$get({ param: { workoutId: id } }),
          client.workouts[":workoutId"].comments.$get({
            param: { workoutId: id },
            query: {},
          }),
        ]);
        const workoutPayload = (await workoutRes.json()) as {
          success?: boolean;
          item?: FeedItem;
          error?: string;
        };
        const commentsPayload = (await commentsRes.json()) as {
          items?: WorkoutComment[];
          comments?: WorkoutComment[];
        };
        if (!workoutRes.ok || !workoutPayload.item) {
          throw new Error(workoutPayload.error ?? "Workout not found.");
        }
        const comments = commentsPayload.items ?? commentsPayload.comments ?? [];
        setItem({
          ...workoutPayload.item,
          commentsPreview: comments.length ? comments : workoutPayload.item.commentsPreview,
          commentCount: comments.length || workoutPayload.item.commentCount,
        });
      } catch (err) {
        setError(getErrorMessage(err, "Unable to load workout."));
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken, id]);

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (error || !item) {
    return (
      <Screen>
        <Title>Workout</Title>
        <Text style={{ color: colors.danger }}>{error || "Not found"}</Text>
      </Screen>
    );
  }

  const canEdit = user?.id === item.workout.userId || user?.id === item.profile.id;

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
        <Title>Workout</Title>
        {canEdit ? (
          <Link href={`/(app)/workouts/${id}/edit`} asChild>
            <Pressable>
              <Text style={{ color: colors.accent, fontWeight: "700" }}>Edit</Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
      <Muted>
        {item.workout.date} · {item.workout.type}
      </Muted>
      <WorkoutCard item={item} />
    </Screen>
  );
}
