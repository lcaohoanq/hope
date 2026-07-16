import type { AppUser } from "@hope/shared";
import { getSocialSummary } from "./repositories/social";

export async function resolveProfileAccess(target: AppUser, viewer?: AppUser) {
  return getSocialSummary(target, viewer?.id);
}
