import { formatDisplayDate } from "@/lib/date-utils";
import type { Language } from "@/lib/i18n";
import type { PublicAppUser } from "@/lib/users";
import type { Workout, WorkoutImage } from "@/lib/workout-types";

export const SOCIAL_STORY_WIDTH = 1080;
export const SOCIAL_STORY_HEIGHT = 1920;

export const SOCIAL_STORY_TEMPLATE_IDS = ["photo-first", "bold-stat", "editorial"] as const;

export type SocialStoryTemplateId = (typeof SOCIAL_STORY_TEMPLATE_IDS)[number];

export type SocialStoryInput = {
  image: WorkoutImage;
  language: Language;
  profile: Pick<PublicAppUser, "displayName" | "username">;
  workout: Workout;
};

export type SocialStoryDisplayValues = {
  activity: string;
  caption: string;
  date: string;
  displayName: string;
  duration: string;
  durationUnit: string;
  durationValue: string;
  username: string;
};

export type CoverCrop = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type TextMeasurer = (text: string) => number;

type FileShareNavigator = {
  canShare?: (data?: ShareData) => boolean;
  share?: (data?: ShareData) => Promise<void>;
};

const socialStoryCopies = {
  en: {
    close: "Close story creator",
    create: "Create story",
    dialogDescription: "Choose a layout, then share or download a 1080 by 1920 PNG.",
    dialogTitle: "Create a story",
    download: "Download PNG",
    generating: "Creating your story...",
    imageError:
      "This workout photo could not be loaded. Try another photo and create the story again.",
    loadingImage: "Loading workout photo...",
    nextTemplate: "Next story template",
    preview: (templateName: string) => `${templateName} story preview`,
    previousTemplate: "Previous story template",
    renderError: "The story image could not be created. Please try again.",
    share: "Share story",
    shareError: "The story could not be shared. You can still download the PNG.",
    templateLabel: "Story templates",
    templates: {
      "bold-stat": "Bold stat",
      editorial: "Editorial",
      "photo-first": "Photo first",
    },
  },
  vi: {
    close: "Đóng trình tạo story",
    create: "Tạo story",
    dialogDescription: "Chọn bố cục, sau đó chia sẻ hoặc tải PNG 1080 × 1920.",
    dialogTitle: "Tạo story",
    download: "Tải PNG",
    generating: "Đang tạo story...",
    imageError: "Không thể tải ảnh buổi tập này. Hãy thử ảnh khác rồi tạo lại story.",
    loadingImage: "Đang tải ảnh buổi tập...",
    nextTemplate: "Mẫu story tiếp theo",
    preview: (templateName: string) => `Xem trước story ${templateName}`,
    previousTemplate: "Mẫu story trước",
    renderError: "Không thể tạo ảnh story. Vui lòng thử lại.",
    share: "Chia sẻ story",
    shareError: "Không thể chia sẻ story. Bạn vẫn có thể tải file PNG.",
    templateLabel: "Các mẫu story",
    templates: {
      "bold-stat": "Chỉ số nổi bật",
      editorial: "Tạp chí",
      "photo-first": "Ảnh nổi bật",
    },
  },
} as const;

export function getSocialStoryCopy(language: Language) {
  return socialStoryCopies[language];
}

export function isSocialStoryTemplateId(value: unknown): value is SocialStoryTemplateId {
  return SOCIAL_STORY_TEMPLATE_IDS.includes(value as SocialStoryTemplateId);
}

export function getSocialStoryDisplayValues(input: SocialStoryInput): SocialStoryDisplayValues {
  const durationMinutes = Math.max(0, Math.round(input.workout.durationMinutes));

  return {
    activity: input.workout.type.trim() || (input.language === "vi" ? "Hoạt động" : "Activity"),
    caption: input.workout.note?.trim() ?? "",
    date: formatDisplayDate(input.workout.date, input.language),
    displayName: input.profile.displayName.trim(),
    duration: formatSocialStoryDuration(durationMinutes, input.language),
    durationUnit: input.language === "vi" ? "PHÚT" : "MINUTES",
    durationValue: String(durationMinutes),
    username: `@${input.profile.username.replace(/^@/, "")}`,
  };
}

export function formatSocialStoryDuration(minutes: number, language: Language) {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) {
    return language === "vi" ? `${safeMinutes} phút` : `${safeMinutes} min`;
  }

  const hourLabel = language === "vi" ? "giờ" : "hr";
  const minuteLabel = language === "vi" ? "phút" : "min";

  return remainingMinutes > 0
    ? `${hours} ${hourLabel} ${remainingMinutes} ${minuteLabel}`
    : `${hours} ${hourLabel}`;
}

export function getSocialStoryFilename(input: SocialStoryInput, template: SocialStoryTemplateId) {
  const date = sanitizeSocialStoryFilenamePart(input.workout.date) || "workout";
  const activity = sanitizeSocialStoryFilenamePart(input.workout.type) || "activity";
  return `hope-${date}-${activity}-${template}.png`;
}

export function sanitizeSocialStoryFilenamePart(value: string) {
  return value
    .trim()
    .replace(/[Đđ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function calculateCoverCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): CoverCrop {
  if (sourceWidth <= 0 || sourceHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;

  if (sourceRatio > targetRatio) {
    const width = sourceHeight * targetRatio;
    return {
      x: (sourceWidth - width) / 2,
      y: 0,
      width,
      height: sourceHeight,
    };
  }

  const height = sourceWidth / targetRatio;
  return {
    x: 0,
    y: (sourceHeight - height) / 2,
    width: sourceWidth,
    height,
  };
}

export function wrapSocialStoryText(
  text: string,
  maxWidth: number,
  maxLines: number,
  measureText: TextMeasurer,
) {
  if (maxWidth <= 0 || maxLines <= 0) return [];

  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";
  let truncated = false;

  wordLoop: for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (measureText(candidate) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = "";
    }

    if (lines.length === maxLines) {
      truncated = true;
      break;
    }

    if (measureText(word) <= maxWidth) {
      currentLine = word;
      continue;
    }

    const fragments = splitLongStoryWord(word, maxWidth, measureText);
    for (const [fragmentIndex, fragment] of fragments.entries()) {
      if (fragmentIndex === fragments.length - 1) {
        currentLine = fragment;
      } else {
        lines.push(fragment);
        if (lines.length === maxLines) {
          truncated = true;
          break wordLoop;
        }
      }
    }
  }

  if (currentLine && lines.length < maxLines) lines.push(currentLine);

  if (truncated && lines.length > 0) {
    lines[lines.length - 1] = truncateStoryLine(lines.at(-1) ?? "", maxWidth, measureText);
  }

  return lines.slice(0, maxLines);
}

export function canNativeShareSocialStory(
  navigatorLike: FileShareNavigator | undefined,
  file: File,
) {
  if (!navigatorLike || typeof navigatorLike.share !== "function") return false;
  if (typeof navigatorLike.canShare !== "function") return false;

  try {
    return navigatorLike.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function splitLongStoryWord(word: string, maxWidth: number, measureText: TextMeasurer) {
  const fragments: string[] = [];
  let fragment = "";

  for (const character of word) {
    const candidate = `${fragment}${character}`;
    if (fragment && measureText(candidate) > maxWidth) {
      fragments.push(fragment);
      fragment = character;
    } else {
      fragment = candidate;
    }
  }

  if (fragment) fragments.push(fragment);
  return fragments;
}

function truncateStoryLine(line: string, maxWidth: number, measureText: TextMeasurer) {
  let value = line.trimEnd();

  while (value && measureText(`${value}…`) > maxWidth) {
    value = value.slice(0, -1).trimEnd();
  }

  return `${value}…`;
}
