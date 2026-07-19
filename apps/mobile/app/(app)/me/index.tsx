import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ProfileView } from "@/components/ProfileView";
import { Muted, Screen, Title } from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useTheme } from "@/context/ThemeContext";

export default function MeScreen() {
  const { user } = useSession();
  const { colors } = useTheme();

  if (!user) {
    return (
      <Screen>
        <Title>Profile</Title>
        <Muted>Sign in required.</Muted>
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingBottom: 32 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
        <Title>Me</Title>
        <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
          <Link href="/(app)/workouts/new" asChild>
            <Pressable>
              <Text style={{ color: colors.accent, fontWeight: "700" }}>Add</Text>
            </Pressable>
          </Link>
          <Link href="/(app)/settings" asChild>
            <Pressable>
              <Text style={{ color: colors.accent, fontWeight: "700" }}>Settings</Text>
            </Pressable>
          </Link>
        </View>
      </View>
      <ScrollView>
        <ProfileView username={user.username} isSelf />
      </ScrollView>
    </Screen>
  );
}
