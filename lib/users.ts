import type { UserProfile, Workout } from "@/lib/workout-types";
import type { Language, LocalizedText } from "@/lib/i18n";

export type HeatmapView =
  | {
      mode: "lifetime";
    }
  | {
      mode: "year";
      year: number;
    };

export type HeatmapDefaultView =
  | {
      mode: "lifetime";
    }
  | {
      mode: "year";
      year?: number;
    };

export type UserLocation = {
  label: LocalizedText;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  zoom?: number;
};

export type UserSocialLinks = {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
};

export type UserCredentials = {
  username: string;
  password: string;
};

export type UserSettings = {
  heatmap: {
    defaultView: HeatmapDefaultView;
  };
  workouts: {
    allowPastWorkoutEdits: boolean;
  };
};

export type AppUser = UserProfile & {
  id: string;
  slug: string;
  credentials: UserCredentials;
  avatarUrl?: string;
  bio: LocalizedText;
  location?: UserLocation;
  pronouns?: LocalizedText;
  preferredLanguage: Language;
  socialLinks?: UserSocialLinks;
  website?: string;
  settings: UserSettings;
};

export const APP_USERS = [
  {
    id: "test",
    slug: "@test",
    displayName: "Test User",
    birthYear: 2004,
    avatarSeed: "test",
    credentials: {
      username: "test",
      password: "123",
    },
    bio: {
      en: "Testing the quiet little rituals that make movement easier to repeat.",
      vi: "Thử những nhịp nhỏ, đều và đủ nhẹ để việc vận động dễ lặp lại hơn.",
    },
    location: {
      label: {
        en: "Da Nang, Vietnam",
        vi: "Đà Nẵng, Việt Nam",
      },
      coordinates: {
        latitude: 16.0544,
        longitude: 108.2022,
      },
      zoom: 13,
    },
    pronouns: {
      en: "they/them",
      vi: "họ",
    },
    preferredLanguage: "vi",
    website: "https://example.com/test",
    socialLinks: {
      facebook: "https://facebook.com/test.fitlog",
      instagram: "https://instagram.com/test.fitlog",
      linkedin: "https://linkedin.com/in/test-fitlog",
    },
    settings: {
      heatmap: {
        defaultView: {
          mode: "year",
        },
      },
      workouts: {
        allowPastWorkoutEdits: false,
      },
    },
  },
  {
    id: "hoang",
    slug: "@hoang",
    displayName: "Hoang Cao Luu",
    birthYear: 2004,
    avatarSeed: "lcaohoanq",
    credentials: {
      username: "hoang",
      password: "123",
    },
    avatarUrl: "/uploads/avatars/hoang-1cf3de80-b2b.webp",
    bio: {
      en: "Expect the Not Expected.",
      vi: "Expect the Not Expected.",
    },
    location: {
      label: {
        en: "Ho Chi Minh City, Vietnam",
        vi: "TP. Hồ Chí Minh, Việt Nam",
      },
      coordinates: {
        latitude: 10.7769,
        longitude: 106.7009,
      },
      zoom: 14,
    },
    pronouns: {
      en: "he/him",
      vi: "anh ấy",
    },
    preferredLanguage: "en",
    website: "https://lcaohoanq.works",
    socialLinks: {
      facebook: "https://facebook.com/lcaohoanq",
      instagram: "https://instagram.com/lcaohoanq",
      linkedin: "https://linkedin.com/in/lcaohoanq",
    },
    settings: {      theme: "dark",
      heatmap: {
        defaultView: {
          mode: "year",
        },
      },
      workouts: {
        allowPastWorkoutEdits: true,
      },
    },
  },
  {
    id: "linh",
    slug: "@linh",
    displayName: "Linh",
    birthYear: 2005,
    avatarSeed: "linh",
    credentials: {
      username: "linh",
      password: "123",
    },
    bio: {
      en: "Building a steady rhythm one logged workout at a time.",
      vi: "Xây nhịp sống đều hơn qua từng buổi tập được ghi lại.",
    },
    location: {
      label: {
        en: "Hanoi, Vietnam",
        vi: "Hà Nội, Việt Nam",
      },
      coordinates: {
        latitude: 21.0285,
        longitude: 105.8542,
      },
      zoom: 13,
    },
    pronouns: {
      en: "she/her",
      vi: "cô ấy",
    },
    preferredLanguage: "vi",
    website: "https://example.com/linh",
    socialLinks: {
      facebook: "https://facebook.com/linh.fitlog",
      instagram: "https://instagram.com/linh.fitlog",
      linkedin: "https://linkedin.com/in/linh-fitlog",
    },
    settings: {
      heatmap: {
        defaultView: {
          mode: "year",
        },
      },
      workouts: {
        allowPastWorkoutEdits: false,
      },
    },
  },
  {
    id: "mviet",
    slug: "@mviet",
    displayName: "Minh Viet",
    birthYear: 2004,
    avatarSeed: "mviet",
    avatarUrl: "/uploads/avatars/mviet-c85b618b-2d6.webp",
    credentials: {
      username: "mviet",
      password: "123456",
    },
    bio: {
      en: "dù vỏ kẹo nó nhăn, nhưng bên trong vẫn ngọt",
      vi: "dù vỏ kẹo nó nhăn, nhưng bên trong vẫn ngọt",
    },
    location: {
      label: {
        en: "Vietnam",
        vi: "Việt Nam",
      },
      coordinates: {
        latitude: 16.0,
        longitude: 106.0,
      },
      zoom: 6,
    },
    preferredLanguage: "en",
    settings: {
      heatmap: {
        defaultView: {
          mode: "year",
        },
      },
      workouts: {
        allowPastWorkoutEdits: false,
      },
    },
  },
] as const satisfies readonly AppUser[];

export type PublicAppUser = Omit<AppUser, "credentials"> & {
  username: string;
};

export const DEFAULT_USER_ID = "hoang";

export function getDefaultUser() {
  return APP_USERS[0];
}

export function getUserById(userId: string) {
  return APP_USERS.find((user) => user.id === userId);
}

export function getUserBySlug(slug: string) {
  const normalizedSlug = normalizeUserSlug(slug);

  return APP_USERS.find((user) => user.slug === normalizedSlug);
}

export function getUserByProfilePath(pathSegment: string) {
  const normalizedValue = normalizeProfilePathSegment(pathSegment);

  return APP_USERS.find(
    (user) =>
      user.credentials.username === normalizedValue ||
      user.slug === normalizeUserSlug(normalizedValue),
  );
}

export function getCanonicalUserPath(user: AppUser | PublicAppUser) {
  return `/${"credentials" in user ? user.credentials.username : user.username}`;
}

export function getUserByUsername(username: string) {
  const normalizedUsername = normalizeUsername(username);

  return APP_USERS.find(
    (user) => user.credentials.username === normalizedUsername,
  );
}

export function authenticateUser(username: string, password: string) {
  const user = getUserByUsername(username);

  if (!user || user.credentials.password !== password) {
    return null;
  }

  return user;
}

export function isKnownUserId(userId: string) {
  return APP_USERS.some((user) => user.id === userId);
}

export function normalizeUserId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const userId = value.trim().toLowerCase();

  return isKnownUserId(userId) ? userId : null;
}

export function isWorkoutVisibleForUser(workout: Workout, userId: string) {
  return workout.userId ? workout.userId === userId : userId === DEFAULT_USER_ID;
}

export function canUserEditWorkoutDate(
  userId: string,
  workoutDate: string,
  todayDateKey: string,
) {
  const user = getUserById(userId);

  if (!user) {
    return false;
  }

  return user.settings.workouts.allowPastWorkoutEdits || workoutDate >= todayDateKey;
}

export function toPublicUser(user: AppUser): PublicAppUser {
  return {
    id: user.id,
    slug: user.slug,
    username: user.credentials.username,
    displayName: user.displayName,
    birthYear: user.birthYear,
    avatarSeed: user.avatarSeed,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    location: user.location,
    pronouns: user.pronouns,
    preferredLanguage: user.preferredLanguage,
    socialLinks: user.socialLinks,
    website: user.website,
    settings: user.settings,
  };
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function normalizeUserSlug(value: string) {
  const decodedValue = safeDecodeURIComponent(value);
  const trimmedValue = decodedValue.trim().toLowerCase();

  return trimmedValue.startsWith("@") ? trimmedValue : `@${trimmedValue}`;
}

function normalizeProfilePathSegment(value: string) {
  const decodedValue = safeDecodeURIComponent(value);
  const trimmedValue = decodedValue.trim().toLowerCase();

  return trimmedValue.startsWith("@") ? trimmedValue.slice(1) : trimmedValue;
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
