import type { AppUser } from "@/lib/users";
import { getSocialSummary } from "@/lib/repositories/social";

export async function resolveProfileAccess(target: AppUser, viewer?: AppUser) {
  return getSocialSummary(target, viewer?.id);
}
