import { useSignUp, useSSO } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Button, Field, Muted, Screen, Title } from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useTheme } from "@/context/ThemeContext";
import { getClerkErrorMessage } from "@/lib/clerk-errors";

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();
  const { refresh } = useSession();
  const { colors } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const finishSession = useCallback(
    async (sessionId: string) => {
      await setActive?.({ session: sessionId });
      await refresh();
      router.replace("/");
    },
    [refresh, router, setActive],
  );

  async function onGoogle() {
    setBusy(true);
    setError("");
    try {
      const { createdSessionId, setActive: setActiveSession } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri({ scheme: "hope", path: "sso-callback" }),
      });
      if (createdSessionId) {
        await (setActiveSession ?? setActive)?.({ session: createdSessionId });
        await refresh();
        router.replace("/");
      }
    } catch (err) {
      setError(getClerkErrorMessage(err, "Unable to continue with Google."));
    } finally {
      setBusy(false);
    }
  }

  async function onSignUp() {
    if (!isLoaded || !signUp) return;
    const emailAddress = email.trim();
    if (!emailAddress) {
      setError("Enter your email.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signUp.create({ emailAddress });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      setError(getClerkErrorMessage(err, "Unable to start sign-up."));
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    if (!isLoaded || !signUp) return;
    setBusy(true);
    setError("");
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === "complete" && result.createdSessionId) {
        await finishSession(result.createdSessionId);
        return;
      }
      setError("Verification incomplete. Try again.");
    } catch (err) {
      setError(getClerkErrorMessage(err, "Unable to verify."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: 16, marginTop: 24 }}>
        <Title>Create account</Title>
        <Muted>Join Hope with Google or a passwordless email code.</Muted>

        <Button label="Continue with Google" onPress={() => void onGoogle()} disabled={busy} />

        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />

        {!pendingVerification ? (
          <>
            <Field
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Button
              label="Email me a code"
              onPress={() => void onSignUp()}
              disabled={busy || !isLoaded}
            />
          </>
        ) : (
          <>
            <Muted>Enter the code we sent to {email.trim()}.</Muted>
            <Field
              label="Verification code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
            />
            <Button label="Verify email" onPress={() => void onVerify()} disabled={busy} />
          </>
        )}

        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        <Link href="/(auth)/sign-in">
          <Text style={{ color: colors.accent }}>Already have an account? Sign in</Text>
        </Link>
      </View>
    </Screen>
  );
}
