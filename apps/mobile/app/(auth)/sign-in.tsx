import { useSignIn, useSSO } from "@clerk/clerk-expo";
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

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const { refresh } = useSession();
  const { colors } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pendingCode, setPendingCode] = useState(false);
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
      const {
        createdSessionId,
        setActive: setActiveSession,
        signIn: ssoSignIn,
        signUp,
      } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri({ scheme: "hope", path: "sso-callback" }),
      });

      if (createdSessionId) {
        await (setActiveSession ?? setActive)?.({ session: createdSessionId });
        await refresh();
        router.replace("/");
        return;
      }

      // Transferable / incomplete OAuth — uncommon but handle gracefully.
      const sessionId = ssoSignIn?.createdSessionId ?? signUp?.createdSessionId;
      if (sessionId) {
        await finishSession(sessionId);
        return;
      }
    } catch (err) {
      setError(getClerkErrorMessage(err, "Unable to continue with Google."));
    } finally {
      setBusy(false);
    }
  }

  async function onSendCode() {
    if (!isLoaded || !signIn) return;
    const identifier = email.trim();
    if (!identifier) {
      setError("Enter your email.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const attempt = await signIn.create({ identifier });
      const emailFactor = attempt.supportedFirstFactors?.find(
        (factor) => factor.strategy === "email_code",
      );
      if (emailFactor?.strategy !== "email_code") {
        setError("Email code sign-in is not enabled for this account.");
        return;
      }
      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailFactor.emailAddressId,
      });
      setPendingCode(true);
    } catch (err) {
      setError(getClerkErrorMessage(err, "Unable to send sign-in code."));
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyCode() {
    if (!isLoaded || !signIn) return;
    setBusy(true);
    setError("");
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: code.trim(),
      });
      if (result.status === "complete" && result.createdSessionId) {
        await finishSession(result.createdSessionId);
        return;
      }
      setError("Verification incomplete. Try requesting a new code.");
    } catch (err) {
      setError(getClerkErrorMessage(err, "Invalid or expired code."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: 16, marginTop: 24 }}>
        <Title>Hope</Title>
        <Muted>Sign in with Google or a passwordless email code.</Muted>

        <Button label="Continue with Google" onPress={() => void onGoogle()} disabled={busy} />

        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />

        {!pendingCode ? (
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
              onPress={() => void onSendCode()}
              disabled={busy || !isLoaded}
            />
          </>
        ) : (
          <>
            <Muted>We sent a code to {email.trim()}.</Muted>
            <Field
              label="Verification code"
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
            />
            <Button
              label="Verify and sign in"
              onPress={() => void onVerifyCode()}
              disabled={busy}
            />
            <Button
              label="Use a different email"
              variant="ghost"
              onPress={() => {
                setPendingCode(false);
                setCode("");
                setError("");
              }}
            />
          </>
        )}

        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        <Link href="/(auth)/sign-up">
          <Text style={{ color: colors.accent }}>Need an account? Sign up</Text>
        </Link>
      </View>
    </Screen>
  );
}
