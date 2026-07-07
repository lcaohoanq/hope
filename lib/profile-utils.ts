import type { UserProfile } from "@/lib/workout-types";

const DICEBEAR_NOTIONISTS_BASE_URL =
  "https://api.dicebear.com/10.x/notionists/svg";

export const USER_PROFILE_STORAGE_KEY = "fitness-tracker-profile";
const USER_PROFILE_CHANGE_EVENT = "fitness-tracker-profile-change";
const DEFAULT_PROFILE: UserProfile = {
  displayName: "Hoang",
  birthYear: 2004,
  avatarSeed: "hoang",
};
let cachedProfileStorageValue: string | null = null;
let cachedProfile: UserProfile | null = null;

export function createAvatarSeed(displayName?: string) {
  const namePart = displayName?.trim().toLowerCase().replace(/\s+/g, "-");
  const randomPart = Math.random().toString(36).slice(2, 10);

  return namePart ? `${namePart}-${randomPart}` : `profile-${randomPart}`;
}

export function getAvatarUrl(seed: string) {
  return `${DICEBEAR_NOTIONISTS_BASE_URL}?seed=${encodeURIComponent(seed)}`;
}

export function readStoredProfile() {
  if (typeof window === "undefined") {
    return DEFAULT_PROFILE;
  }

  try {
    const value = window.localStorage.getItem(USER_PROFILE_STORAGE_KEY);

    if (!value) {
      storeDefaultProfile();
      return DEFAULT_PROFILE;
    }

    if (value === cachedProfileStorageValue) {
      return cachedProfile;
    }

    const parsed = JSON.parse(value) as Partial<UserProfile>;

    if (
      typeof parsed.displayName !== "string" ||
      typeof parsed.birthYear !== "number" ||
      typeof parsed.avatarSeed !== "string"
    ) {
      storeDefaultProfile();
      return DEFAULT_PROFILE;
    }

    cachedProfileStorageValue = value;
    cachedProfile = {
      displayName: parsed.displayName,
      birthYear: parsed.birthYear,
      avatarSeed: parsed.avatarSeed,
    };

    return cachedProfile;
  } catch {
    cachedProfileStorageValue = null;
    cachedProfile = DEFAULT_PROFILE;
    return DEFAULT_PROFILE;
  }
}

export function subscribeToProfileChanges(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(USER_PROFILE_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(USER_PROFILE_CHANGE_EVENT, onStoreChange);
  };
}

export function storeProfile(profile: UserProfile) {
  window.localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event(USER_PROFILE_CHANGE_EVENT));
}

export function clearStoredProfile() {
  window.localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
  window.dispatchEvent(new Event(USER_PROFILE_CHANGE_EVENT));
}

function storeDefaultProfile() {
  const serializedProfile = JSON.stringify(DEFAULT_PROFILE);
  window.localStorage.setItem(USER_PROFILE_STORAGE_KEY, serializedProfile);
  cachedProfileStorageValue = serializedProfile;
  cachedProfile = DEFAULT_PROFILE;
}
