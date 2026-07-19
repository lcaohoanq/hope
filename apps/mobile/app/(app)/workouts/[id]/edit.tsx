import type { FeedItem, Workout } from "@hope/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { LoadingState, Screen, Title } from "@/components/ui";
import { WorkoutForm } from "@/components/WorkoutForm";
import { useTheme } from "@/context/ThemeContext";
import { getErrorMessage, getMobileApiClient } from "@/lib/api";
import { useStableGetToken } from "@/lib/useStableGetToken";
import { updateWorkout } from "@/lib/workouts";

export default function EditWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const getToken = useStableGetToken();
  const { colors } = useTheme();
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const token = await getToken();
        const client = getMobileApiClient(token);
        const res = await client.workouts[":workoutId"].$get({ param: { workoutId: id } });
        const payload = (await res.json()) as {
          item?: FeedItem;
          workout?: Workout;
          error?: string;
        };
        const next = payload.item?.workout ?? payload.workout;
        if (!res.ok || !next) throw new Error(payload.error ?? "Workout not found.");
        setWorkout(next);
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

  if (error || !workout) {
    return (
      <Screen>
        <Title>Edit workout</Title>
        <Text style={{ color: colors.danger }}>{error || "Not found"}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Edit workout</Title>
      <WorkoutForm
        submitLabel="Update workout"
        initial={{
          id: workout.id,
          date: workout.date,
          type: workout.type,
          note: workout.note ?? "",
          isPublic: workout.isPublic,
          existingImageSrcs: (workout.images ?? []).map((image) => image.src),
        }}
        onSubmit={async (input) => {
          const token = await getToken();
          await updateWorkout({ ...input, id: workout.id }, token);
          router.replace(`/(app)/workouts/${workout.id}`);
        }}
      />
    </Screen>
  );
}
