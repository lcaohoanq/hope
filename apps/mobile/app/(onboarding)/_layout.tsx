import { Redirect, Stack } from "expo-router";
import { LoadingState, Screen } from "@/components/ui";
import { useSession } from "@/context/SessionContext";

export default function OnboardingLayout() {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (status === "signed-out") return <Redirect href="/(auth)/sign-in" />;
  if (status === "ready") return <Redirect href="/(app)/feed" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
