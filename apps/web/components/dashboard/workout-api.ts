import { getApiErrorMessage, getClientApiClient } from "@/lib/http";
import type { UserSettings } from "@/lib/users";
import { uploadWorkoutImagesDirectly } from "@/lib/workout-image-upload";
import type { Workout, WorkoutData, WorkoutInput, WorkoutUpdateInput } from "@/lib/workout-types";
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
  token?: string | null,
) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= WORKOUT_LOAD_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const client = getClientApiClient(token);
      const res = await client.workouts.$get({ query: { userId } });
      const payload = await res.json();

      if (!res.ok || ("success" in payload && !(payload as { success: boolean }).success)) {
        throw new Error(
          ("error" in payload ? (payload as ApiErrorResponse).error : null) ?? fallbackMessage,
        );
      }

      return payload as WorkoutData;
    } catch (error) {
      lastError = error;

      const retryDelay = WORKOUT_LOAD_RETRY_DELAYS_MS[attempt];

      if (retryDelay === undefined) {
        break;
      }

      await wait(retryDelay);
    }
  }

  throw new Error(getApiErrorMessage(lastError, fallbackMessage));
}

export async function prepareWorkoutRequestData(
  input: WorkoutInput | WorkoutUpdateInput,
  token?: string | null,
) {
  const { images = [], ...workoutInput } = input;
  const uploadedImagePublicIds = await uploadWorkoutImagesDirectly(images, token);

  return {
    data: {
      ...workoutInput,
      imagePublicIds: uploadedImagePublicIds,
    },
    uploadedImagePublicIds,
  };
}
