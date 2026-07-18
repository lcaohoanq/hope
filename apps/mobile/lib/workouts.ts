import type { Workout } from "@hope/shared";
import { getErrorMessage, getMobileApiClient } from "@/lib/api";
import {
  cleanupWorkoutImageUploads,
  type PickedImage,
  uploadWorkoutImages,
} from "@/lib/workout-images";

export type MobileWorkoutInput = {
  date: string;
  type: string;
  note: string;
  isPublic: boolean;
  images?: PickedImage[];
  imageSrcs?: string[];
  id?: string;
};

export async function prepareWorkoutRequestData(input: MobileWorkoutInput, token?: string | null) {
  const { images = [], ...workoutInput } = input;
  const uploadedImagePublicIds = await uploadWorkoutImages(images, token);
  return {
    data: {
      ...workoutInput,
      imagePublicIds: uploadedImagePublicIds,
    },
    uploadedImagePublicIds,
  };
}

export async function createWorkout(
  input: MobileWorkoutInput,
  token?: string | null,
): Promise<Workout> {
  const prepared = await prepareWorkoutRequestData(input, token);
  try {
    const client = getMobileApiClient(token);
    const res = await client.workouts.$post({ json: prepared.data });
    const payload = (await res.json()) as {
      success: boolean;
      workout?: Workout;
      error?: string;
    };
    if (!payload.success || !payload.workout) {
      throw new Error(payload.error ?? "Unable to create workout.");
    }
    return payload.workout;
  } catch (error) {
    await cleanupWorkoutImageUploads(prepared.uploadedImagePublicIds, token);
    throw new Error(getErrorMessage(error, "Unable to create workout."));
  }
}

export async function updateWorkout(
  input: MobileWorkoutInput & { id: string },
  token?: string | null,
): Promise<Workout> {
  const prepared = await prepareWorkoutRequestData(input, token);
  try {
    const client = getMobileApiClient(token);
    const res = await client.workouts.$patch({ json: prepared.data });
    const payload = (await res.json()) as {
      success: boolean;
      workout?: Workout;
      error?: string;
    };
    if (!payload.success || !payload.workout) {
      throw new Error(payload.error ?? "Unable to update workout.");
    }
    return payload.workout;
  } catch (error) {
    await cleanupWorkoutImageUploads(prepared.uploadedImagePublicIds, token);
    throw new Error(getErrorMessage(error, "Unable to update workout."));
  }
}
