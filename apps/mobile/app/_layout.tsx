import "react-native-gesture-handler";
import { ClerkProvider } from "@clerk/clerk-expo";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { getClerkPublishableKey } from "@/lib/env";
import { tokenCache } from "@/lib/token-cache";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { theme, colors } = useTheme();

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.panel },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

function ThemedApp() {
  const { user } = useSession();
  // ThemeProvider stays mounted; it syncs when initialTheme updates.
  return (
    <ThemeProvider initialTheme={user?.settings.theme ?? "light"}>
      <RootNavigator />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const publishableKey = getClerkPublishableKey();

  if (!publishableKey) {
    console.warn(
      "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Set it in apps/mobile/.env or the monorepo root.",
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey || "pk_placeholder"} tokenCache={tokenCache}>
        <SessionProvider>
          <ThemedApp />
        </SessionProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
