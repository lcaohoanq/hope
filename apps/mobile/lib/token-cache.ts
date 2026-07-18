import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Clerk token cache backed by SecureStore on native.
 * Web falls back to in-memory / no-op (Clerk handles browser storage).
 */
export const tokenCache = {
  async getToken(key: string) {
    if (Platform.OS === "web") return null;
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    if (Platform.OS === "web") return;
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Ignore SecureStore errors (simulator / restricted devices).
    }
  },
};
