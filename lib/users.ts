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

export type AppUser = UserProfile & {
  id: string;
  slug: string;
  bio: LocalizedText;
  location?: UserLocation;
  pronouns?: LocalizedText;
  preferredLanguage: Language;
  socialLinks?: UserSocialLinks;
  website?: string;
  heatmapSettings: {
    defaultView: HeatmapDefaultView;
  };
};

export const APP_USERS = [
  {
    id: "test",
    slug: "@test",
    displayName: "Test User",
    birthYear: 2004,
    avatarSeed: "test",
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
    heatmapSettings: {
      defaultView: {
        mode: "year",
      },
    },
  },
  {
    id: "hoang",
    slug: "@hoang",
    displayName: "Hoang",
    birthYear: 2004,
    avatarSeed: "hoang",
    bio: {
      en: "Expect the Not Expected.",
      vi: "Luôn sẵn sàng cho điều không ngờ.",
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
    preferredLanguage: "vi",
    website: "https://example.com/hoang",
    socialLinks: {
      facebook: "https://facebook.com/hoang.fitlog",
      instagram: "https://instagram.com/hoang.fitlog",
      linkedin: "https://linkedin.com/in/hoang-fitlog",
    },
    heatmapSettings: {
      defaultView: {
        mode: "year",
      },
    },
  },
  {
    id: "linh",
    slug: "@linh",
    displayName: "Linh",
    birthYear: 2005,
    avatarSeed: "linh",
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
    heatmapSettings: {
      defaultView: {
        mode: "year",
      },
    },
  },
] as const satisfies readonly AppUser[];

export const DEFAULT_USER_ID = "hoang";

export function getDefaultUser() {
  return APP_USERS[0];
}

export function getUserBySlug(slug: string) {
  const normalizedSlug = normalizeUserSlug(slug);

  return APP_USERS.find((user) => user.slug === normalizedSlug);
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

function normalizeUserSlug(value: string) {
  const decodedValue = safeDecodeURIComponent(value);
  const trimmedValue = decodedValue.trim().toLowerCase();

  return trimmedValue.startsWith("@") ? trimmedValue : `@${trimmedValue}`;
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
