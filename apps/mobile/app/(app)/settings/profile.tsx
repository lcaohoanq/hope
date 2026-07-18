import { useAuth } from "@clerk/clerk-expo";
import { profileUpdateSchema } from "@hope/shared";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Field, Screen, Title } from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useTheme } from "@/context/ThemeContext";
import { getErrorMessage, getMobileApiClient } from "@/lib/api";
import { getApiUrl } from "@/lib/env";

export default function ProfileSettingsScreen() {
  const { user, setUser, refresh } = useSession();
  const { getToken } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [birthYear, setBirthYear] = useState(String(user?.birthYear ?? ""));
  const [bioEn, setBioEn] = useState(user?.bio?.en ?? "");
  const [bioVi, setBioVi] = useState(user?.bio?.vi ?? "");
  const [website, setWebsite] = useState(user?.website ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError("");
    const parsed = profileUpdateSchema.safeParse({
      displayName: displayName.trim(),
      birthYear: Number(birthYear),
      bio: { en: bioEn, vi: bioVi },
      website: website.trim() || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid profile.");
      setBusy(false);
      return;
    }
    try {
      const token = await getToken();
      const client = getMobileApiClient(token);
      const res = await client.users.profile.$patch({ json: parsed.data });
      const payload = (await res.json()) as {
        success?: boolean;
        user?: NonNullable<typeof user>;
        error?: string;
      };
      if (!res.ok || !payload.user) throw new Error(payload.error ?? "Unable to update profile.");
      setUser(payload.user);
      await refresh();
      router.back();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update profile."));
    } finally {
      setBusy(false);
    }
  }

  async function uploadAvatar() {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0]) return;
    setBusy(true);
    setError("");
    try {
      const token = await getToken();
      const asset = picked.assets[0];
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: asset.fileName ?? "avatar.jpg",
        type: asset.mimeType ?? "image/jpeg",
      } as unknown as Blob);
      const res = await fetch(`${getApiUrl()}/users/avatar`, {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = (await res.json()) as {
        success?: boolean;
        avatarUrl?: string;
        error?: string;
      };
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "Unable to upload avatar.");
      if (user && payload.avatarUrl) setUser({ ...user, avatarUrl: payload.avatarUrl });
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to upload avatar."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Edit profile</Title>
      <View style={{ gap: 12, marginTop: 12 }}>
        <Field label="Display name" value={displayName} onChangeText={setDisplayName} />
        <Field
          label="Birth year"
          keyboardType="number-pad"
          value={birthYear}
          onChangeText={setBirthYear}
        />
        <Field label="Bio (EN)" value={bioEn} onChangeText={setBioEn} multiline />
        <Field label="Bio (VI)" value={bioVi} onChangeText={setBioVi} multiline />
        <Field label="Website" autoCapitalize="none" value={website} onChangeText={setWebsite} />
        <Button
          label="Change avatar"
          variant="ghost"
          onPress={() => void uploadAvatar()}
          disabled={busy}
        />
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        <Button label="Save" onPress={() => void save()} disabled={busy} />
      </View>
    </Screen>
  );
}
