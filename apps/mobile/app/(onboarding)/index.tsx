import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Text, View } from "react-native";
import { Button, Field, Muted, Screen, Title } from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useTheme } from "@/context/ThemeContext";
import { getErrorMessage, getMobileApiClient } from "@/lib/api";
import { createAvatarSeed, getAvatarUrl } from "@/lib/avatar";

export default function OnboardingScreen() {
  const { getToken } = useAuth();
  const { refresh, setUser } = useSession();
  const { colors } = useTheme();
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [step, setStep] = useState<"name" | "birthYear">("name");
  const [displayName, setDisplayName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [avatarSeed, setAvatarSeed] = useState("profile-preview");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const avatarUrl = useMemo(() => getAvatarUrl(avatarSeed), [avatarSeed]);

  function continueName() {
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      setError("Please enter at least 2 characters.");
      return;
    }
    setDisplayName(trimmed);
    setAvatarSeed((current) =>
      current.startsWith("profile-") ? createAvatarSeed(trimmed) : current,
    );
    setError("");
    setStep("birthYear");
  }

  async function complete() {
    const year = Number(birthYear);
    if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
      setError(`Birth year must be between 1900 and ${currentYear}.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const token = await getToken();
      const client = getMobileApiClient(token);
      const res = await client.users.profile.$post({
        json: { displayName: displayName.trim(), birthYear: year, avatarSeed },
      });
      const payload = (await res.json()) as {
        success: boolean;
        user?: Parameters<typeof setUser>[0];
        error?: string;
      };
      if (!payload.success || !payload.user) {
        throw new Error(payload.error ?? "Unable to create your profile.");
      }
      setUser(payload.user);
      await refresh();
      router.replace("/(app)/feed");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create your profile."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: 16, marginTop: 40 }}>
        <Muted>First run</Muted>
        <Title>Start with a clean timeline.</Title>
        <Image source={{ uri: avatarUrl }} style={{ width: 88, height: 88, borderRadius: 44 }} />
        {step === "name" ? (
          <>
            <Field label="Display name" value={displayName} onChangeText={setDisplayName} />
            <Button label="Continue" onPress={continueName} />
          </>
        ) : (
          <>
            <Field
              label="Birth year"
              keyboardType="number-pad"
              value={birthYear}
              onChangeText={setBirthYear}
            />
            <Button label="Create profile" onPress={() => void complete()} disabled={busy} />
            <Button label="Back" onPress={() => setStep("name")} variant="ghost" />
          </>
        )}
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      </View>
    </Screen>
  );
}
