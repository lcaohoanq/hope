import "server-only";

import { cleanupUploadedAssets, isOwnedWorkoutImagePublicId } from "@/lib/cloudinary";
import { listAttachedWorkoutImagePublicIds } from "@/lib/repositories/workouts";

export async function cleanupUnattachedWorkoutImageAssets(profileId: string, publicIds: string[]) {
  const ownedPublicIds = [
    ...new Set(publicIds.filter((publicId) => isOwnedWorkoutImagePublicId(profileId, publicId))),
  ];

  if (ownedPublicIds.length === 0) {
    return { deleted: [] as string[], skipped: [] as string[] };
  }

  const attachedPublicIds = new Set(await listAttachedWorkoutImagePublicIds(ownedPublicIds));
  const deletablePublicIds = ownedPublicIds.filter((publicId) => !attachedPublicIds.has(publicId));

  const cleanupResults = await cleanupUploadedAssets(deletablePublicIds);

  if (cleanupResults.some((result) => result.status === "rejected")) {
    throw new Error("Unable to clean up one or more workout images.");
  }

  return {
    deleted: deletablePublicIds,
    skipped: ownedPublicIds.filter((publicId) => attachedPublicIds.has(publicId)),
  };
}
