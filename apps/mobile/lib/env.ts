import Constants from "expo-constants";

/**
 * API origin for Hope Hono (no trailing slash).
 * Android emulator: http://10.0.2.2:8787
 * iOS simulator: http://localhost:8787
 * Physical device: http://<LAN-IP>:8787
 */
export function getApiUrl() {
  return (
    process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
    "http://localhost:8787"
  );
}

export function getClerkPublishableKey() {
  const key =
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    (Constants.expoConfig?.extra as { clerkPublishableKey?: string } | undefined)
      ?.clerkPublishableKey ??
    "";
  return key;
}

/** Web app origin for billing / legal deep links. */
export function getWebAppUrl() {
  return (
    process.env.EXPO_PUBLIC_APP_URL ??
    (Constants.expoConfig?.extra as { appUrl?: string } | undefined)?.appUrl ??
    "http://localhost:3000"
  );
}
