import { useRouter } from "expo-router";
import { useEffect } from "react";
import { LoadingState, Screen } from "@/components/ui";
import { useSession } from "@/context/SessionContext";

/**
 * OAuth redirect landing. Clerk completes the browser session via
 * WebBrowser.maybeCompleteAuthSession(); this route just returns to the app gate.
 */
export default function SsoCallbackScreen() {
  const router = useRouter();
  const { refresh, status } = useSession();

  useEffect(() => {
    void (async () => {
      await refresh();
      router.replace("/");
    })();
  }, [refresh, router]);

  return (
    <Screen>
      <LoadingState label={status === "ready" ? "Signed in…" : "Finishing Google sign-in…"} />
    </Screen>
  );
}
