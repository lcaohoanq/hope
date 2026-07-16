import { isOwnedWorkoutImagePublicId } from "./cloudinary";
import { listAttachedWorkoutImagePublicIds } from "./repositories/workouts";
import { getStorageAdapter } from "./storage/index";

export async function cleanupUnattachedWorkoutImageAssets(profileId: string, publicIds: string[]) {
  const ownedPublicIds = [
    ...new Set(publicIds.filter((publicId) => isOwnedWorkoutImagePublicId(profileId, publicId))),
  ];

  if (ownedPublicIds.length === 0) {
    return { deleted: [] as string[], skipped: [] as string[] };
  }

  const attachedPublicIds = new Set(await listAttachedWorkoutImagePublicIds(ownedPublicIds));
  const deletablePublicIds = ownedPublicIds.filter((publicId) => !attachedPublicIds.has(publicId));

  const adapter = getStorageAdapter();
  const cleanupResults = await Promise.allSettled(
    deletablePublicIds.map((publicId) => adapter.delete(publicId)),
  );

  if (cleanupResults.some((result) => result.status === "rejected")) {
    throw new Error("Unable to clean up one or more workout images.");
  }

  return {
    deleted: deletablePublicIds,
    skipped: ownedPublicIds.filter((publicId) => attachedPublicIds.has(publicId)),
  };
}
