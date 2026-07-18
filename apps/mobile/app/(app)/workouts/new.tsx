import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Screen, Title } from "@/components/ui";
import { WorkoutForm } from "@/components/WorkoutForm";
import { createWorkout } from "@/lib/workouts";

export default function NewWorkoutScreen() {
  const { getToken } = useAuth();
  const router = useRouter();

  return (
    <Screen>
      <Title>New workout</Title>
      <WorkoutForm
        submitLabel="Save workout"
        onSubmit={async (input) => {
          const token = await getToken();
          const workout = await createWorkout(input, token);
          router.replace(`/(app)/workouts/${workout.id}`);
        }}
      />
    </Screen>
  );
}
