import { getSocialSummary } from "@/lib/repositories/social";
import type { AppUser } from "@/lib/users";

export async function resolveProfileAccess(target: AppUser, viewer?: AppUser) {
  return getSocialSummary(target, viewer?.id);
}
