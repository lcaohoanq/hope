import { prepareWorkoutImageUploads } from "@/lib/image-previews";
import type { UserSettings } from "@/lib/users";
import type {
  Workout,
  WorkoutData,
  WorkoutInput,
  WorkoutUpdateInput,
} from "@/lib/workout-types";
import { wait } from "./dashboard-utils";

type ApiErrorResponse = {
  success: false;
  error: string;
};

export type CreateWorkoutResponse =
  | {
      success: true;
      workout: Workout;
    }
  | ApiErrorResponse;

export type UpdateWorkoutResponse =
  | {
      success: true;
      workout: Workout;
    }
  | ApiErrorResponse;

export type UploadAvatarResponse =
  | {
      success: true;
      avatarUrl: string;
    }
  | ApiErrorResponse;

export type UpdateSettingsResponse =
  | {
      success: true;
      settings: UserSettings;
    }
  | ApiErrorResponse;

const WORKOUT_LOAD_RETRY_DELAYS_MS = [500, 1000];

export async function fetchWorkoutDataWithRetry(
  userId: string,
  fallbackMessage: string,
) {
  let lastError: unknown;

  for (
    let attempt = 0;
    attempt <= WORKOUT_LOAD_RETRY_DELAYS_MS.length;
    attempt += 1
  ) {
    try {
      const response = await fetch(`/api/workouts?userId=${userId}`, {
        cache: "no-store",
      });
      const payload = await readApiJson<WorkoutData | ApiErrorResponse>(
        response,
        fallbackMessage,
      );

      if (!response.ok || "success" in payload) {
        throw new Error("error" in payload ? payload.error : fallbackMessage);
      }

      return payload;
    } catch (error) {
      lastError = error;

      const retryDelay = WORKOUT_LOAD_RETRY_DELAYS_MS[attempt];

      if (retryDelay === undefined) {
        break;
      }

      await wait(retryDelay);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(fallbackMessage);
}

export async function createWorkoutRequestInit(
  input: WorkoutInput | WorkoutUpdateInput,
) {
  const hasImages = input.images && input.images.length > 0;
  const imageSrcs = "imageSrcs" in input ? input.imageSrcs : undefined;

  if (!hasImages) {
    return {
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...input,
        ...(imageSrcs ? { imageSrcs } : {}),
      }),
    };
  }

  const body = new FormData();

  if ("id" in input) {
    body.set("id", input.id);
  }

  body.set("date", input.date);
  body.set("type", input.type);
  body.set("startTime", input.startTime);
  body.set("endTime", input.endTime);
  body.set("note", input.note);

  imageSrcs?.forEach((src) => {
    body.append("imageSrcs", src);
  });

  const uploadImages = await prepareWorkoutImageUploads(input.images ?? []);

  uploadImages.forEach((image) => {
    body.append("images", image);
  });

  return {
    body,
  };
}

export async function readApiJson<T>(
  response: Response,
  fallbackMessage: string,
) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      `${fallbackMessage} The server returned a non-JSON response.`,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${fallbackMessage} The server returned invalid JSON.`);
  }
}
