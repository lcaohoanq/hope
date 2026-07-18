import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { LoadingState, Screen } from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useTheme } from "@/context/ThemeContext";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{ color: focused ? colors.accent : colors.muted, fontSize: 11, fontWeight: "700" }}
    >
      {label}
    </Text>
  );
}

export default function AppLayout() {
  const { status } = useSession();
  const { colors } = useTheme();

  // Only block the tab shell on the first bootstrap. Soft session refreshes
  // keep status as ready/onboarding so screens are not remounted.
  if (status === "loading") {
    return (
      <Screen>
        <LoadingState label="Starting Hope…" />
      </Screen>
    );
  }

  if (status === "signed-out") return <Redirect href="/(auth)/sign-in" />;
  if (status === "onboarding") return <Redirect href="/(onboarding)" />;
  if (status === "api_unreachable") {
    return (
      <Screen>
        <LoadingState label="API unreachable — check EXPO_PUBLIC_API_URL" />
      </Screen>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.panel },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="feed/index"
        options={{
          title: "Feed",
          tabBarIcon: ({ focused }) => <TabIcon label="Feed" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications/index"
        options={{
          title: "Alerts",
          tabBarIcon: ({ focused }) => <TabIcon label="Alerts" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="me/index"
        options={{
          title: "Me",
          tabBarIcon: ({ focused }) => <TabIcon label="Me" focused={focused} />,
        }}
      />
      <Tabs.Screen name="settings/index" options={{ href: null, title: "Settings" }} />
      <Tabs.Screen name="settings/profile" options={{ href: null, title: "Edit profile" }} />
      <Tabs.Screen name="users/[username]/index" options={{ href: null, title: "Profile" }} />
      <Tabs.Screen name="users/[username]/workouts" options={{ href: null, title: "Workouts" }} />
      <Tabs.Screen name="users/[username]/followers" options={{ href: null, title: "Followers" }} />
      <Tabs.Screen name="users/[username]/following" options={{ href: null, title: "Following" }} />
      <Tabs.Screen name="workouts/[id]/index" options={{ href: null, title: "Workout" }} />
      <Tabs.Screen name="workouts/[id]/edit" options={{ href: null, title: "Edit workout" }} />
      <Tabs.Screen name="workouts/new" options={{ href: null, title: "New workout" }} />
      <Tabs.Screen name="search/index" options={{ href: null, title: "Search" }} />
    </Tabs>
  );
}
