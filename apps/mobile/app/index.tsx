import { Redirect } from "expo-router";
import { LoadingState, Screen } from "@/components/ui";
import { useSession } from "@/context/SessionContext";

export default function Index() {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <Screen>
        <LoadingState label="Starting Hope…" />
      </Screen>
    );
  }

  if (status === "signed-out" || status === "session_mismatch" || status === "api_unreachable") {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (status === "onboarding") {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(app)/feed" />;
}
