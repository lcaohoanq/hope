import { Redirect, Stack } from "expo-router";
import { LoadingState, Screen } from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useTheme } from "@/context/ThemeContext";

export default function AuthLayout() {
  const { status } = useSession();
  const { colors } = useTheme();

  if (status === "loading") {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (status === "onboarding") return <Redirect href="/(onboarding)" />;
  if (status === "ready") return <Redirect href="/(app)/feed" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.panel },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="sign-in" options={{ title: "Sign in" }} />
      <Stack.Screen name="sign-up" options={{ title: "Sign up" }} />
      <Stack.Screen name="sso-callback" options={{ title: "Signing in", headerShown: false }} />
    </Stack>
  );
}
