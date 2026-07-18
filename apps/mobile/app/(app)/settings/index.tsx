import { useAuth } from "@clerk/clerk-expo";
import type { AppTheme } from "@hope/shared";
import { Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Button, Card, Muted, Screen, Title } from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useTheme } from "@/context/ThemeContext";
import { getErrorMessage, getMobileApiClient } from "@/lib/api";
import { getWebAppUrl } from "@/lib/env";

export default function SettingsScreen() {
  const { getToken, signOut } = useAuth();
  const { user, refresh, setUser } = useSession();
  const { theme, setTheme, colors } = useTheme();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function patchTheme(next: AppTheme) {
    setBusy(true);
    setError("");
    try {
      const token = await getToken();
      const client = getMobileApiClient(token);
      const res = await client.users.settings.$patch({ json: { theme: next } });
      if (!res.ok) throw new Error("Unable to update theme.");
      setTheme(next);
      if (user) setUser({ ...user, settings: { ...user.settings, theme: next } });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update theme."));
    } finally {
      setBusy(false);
    }
  }

  async function patchPrivacy(isPrivate: boolean) {
    setBusy(true);
    setError("");
    try {
      const token = await getToken();
      const client = getMobileApiClient(token);
      const res = await client.users.privacy.$patch({ json: { isPrivate } });
      if (!res.ok) throw new Error("Unable to update privacy.");
      if (user) setUser({ ...user, isPrivate });
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update privacy."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Settings</Title>
      <Muted>Account, privacy, and appearance.</Muted>

      <Card>
        <Text style={{ color: colors.text, fontWeight: "700" }}>Theme</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button
            label="Light"
            variant={theme === "light" ? "primary" : "ghost"}
            disabled={busy}
            onPress={() => void patchTheme("light")}
          />
          <Button
            label="Dark"
            variant={theme === "dark" ? "primary" : "ghost"}
            disabled={busy}
            onPress={() => void patchTheme("dark")}
          />
        </View>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontWeight: "700" }}>Language</Text>
        <Muted>
          Preferred language: {user?.preferredLanguage ?? "en"} (edit via profile on web for now)
        </Muted>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontWeight: "700" }}>Privacy</Text>
        <Muted>{user?.isPrivate ? "Private account" : "Public account"}</Muted>
        <Button
          label={user?.isPrivate ? "Make public" : "Make private"}
          variant="ghost"
          disabled={busy}
          onPress={() => void patchPrivacy(!user?.isPrivate)}
        />
      </Card>

      <Card>
        <Link href="/(app)/settings/profile" asChild>
          <Pressable>
            <Text style={{ color: colors.accent, fontWeight: "700" }}>Edit profile</Text>
          </Pressable>
        </Link>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontWeight: "700" }}>Plan</Text>
        <Muted>Current: {user?.plan ?? "standard"}</Muted>
        <Button
          label="Upgrade on web"
          variant="ghost"
          onPress={() => void WebBrowser.openBrowserAsync(`${getWebAppUrl()}/pricing`)}
        />
        <Button
          label="Privacy policy"
          variant="ghost"
          onPress={() => void WebBrowser.openBrowserAsync(`${getWebAppUrl()}/privacy-policy`)}
        />
        <Button
          label="Terms of service"
          variant="ghost"
          onPress={() => void WebBrowser.openBrowserAsync(`${getWebAppUrl()}/terms-of-service`)}
        />
      </Card>

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

      <Button
        label="Sign out"
        variant="danger"
        onPress={() => {
          void signOut();
        }}
      />
    </Screen>
  );
}
