import { CLERK_PRO_PLAN_SLUG, type UserPlan } from "@hope/shared";
import { updateProfilePlan } from "../repositories/profiles";

const ACTIVE_ITEM_STATUSES = new Set(["active", "past_due", "upcoming"]);

type BillingPayer = {
  user_id?: string | null;
  organization_id?: string | null;
};

type BillingPlanRef = {
  slug?: string | null;
};

type BillingSubscriptionItem = {
  status?: string | null;
  plan?: BillingPlanRef | null;
  payer?: BillingPayer | null;
};

type BillingSubscription = {
  payer?: BillingPayer | null;
  items?: BillingSubscriptionItem[] | null;
  status?: string | null;
};

export type ClerkBillingWebhookEvent = {
  type: string;
  data: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readSubscription(data: unknown): BillingSubscription {
  const record = asRecord(data);
  const payer = asRecord(record?.payer) as BillingPayer | null;
  const items = Array.isArray(record?.items) ? (record.items as BillingSubscriptionItem[]) : [];
  return {
    payer: payer ?? undefined,
    items,
    status: typeof record?.status === "string" ? record.status : null,
  };
}

function readSubscriptionItem(data: unknown): BillingSubscriptionItem {
  const record = asRecord(data) as BillingSubscriptionItem | null;
  return {
    status: record?.status ?? null,
    plan: record?.plan ?? null,
    payer: (asRecord(record?.payer) as BillingPayer | null) ?? null,
  };
}

function hopePlanFromActiveItems(items: BillingSubscriptionItem[]): UserPlan {
  const hasPro = items.some(
    (item) =>
      item.plan?.slug === CLERK_PRO_PLAN_SLUG &&
      typeof item.status === "string" &&
      ACTIVE_ITEM_STATUSES.has(item.status),
  );
  return hasPro ? "pro" : "standard";
}

function isProItem(item: BillingSubscriptionItem) {
  return item.plan?.slug === CLERK_PRO_PLAN_SLUG;
}

async function syncPlanForUser(clerkUserId: string, plan: UserPlan) {
  const updated = await updateProfilePlan(clerkUserId, plan);
  if (!updated) {
    console.warn(`Clerk billing webhook: no profile for clerk user ${clerkUserId}`);
    return { synced: false as const, plan };
  }
  return { synced: true as const, plan, profileId: updated.id };
}

/**
 * Mirror Clerk Billing subscription lifecycle into `profiles.plan`.
 *
 * Event names follow Clerk (not Stripe). Cancellation is item-level
 * (`subscriptionItem.canceled`), never `subscription.canceled`.
 *
 * @see https://clerk.com/docs/guides/development/webhooks/billing
 */
export async function syncHopePlanFromClerkBillingEvent(event: ClerkBillingWebhookEvent) {
  switch (event.type) {
    case "subscription.created":
    case "subscription.active":
    case "subscription.updated": {
      const data = readSubscription(event.data);
      const clerkUserId = data.payer?.user_id;
      if (!clerkUserId) return { handled: false as const, reason: "no_user_payer" as const };
      const result = await syncPlanForUser(clerkUserId, hopePlanFromActiveItems(data.items ?? []));
      return { handled: true as const, clerkUserId, ...result };
    }
    case "subscriptionItem.active":
    case "subscriptionItem.updated": {
      const data = readSubscriptionItem(event.data);
      const clerkUserId = data.payer?.user_id;
      if (!clerkUserId) return { handled: false as const, reason: "no_user_payer" as const };
      // Free-plan renewals must not wipe Pro; only upgrade when this item is Pro+active.
      if (
        isProItem(data) &&
        typeof data.status === "string" &&
        ACTIVE_ITEM_STATUSES.has(data.status)
      ) {
        const result = await syncPlanForUser(clerkUserId, "pro");
        return { handled: true as const, clerkUserId, ...result };
      }
      return { handled: true as const, clerkUserId, synced: false as const, plan: null };
    }
    case "subscriptionItem.canceled":
    case "subscriptionItem.ended":
    case "subscriptionItem.abandoned":
    case "subscriptionItem.expired": {
      const data = readSubscriptionItem(event.data);
      const clerkUserId = data.payer?.user_id;
      if (!clerkUserId) return { handled: false as const, reason: "no_user_payer" as const };
      if (isProItem(data)) {
        const result = await syncPlanForUser(clerkUserId, "standard");
        return { handled: true as const, clerkUserId, ...result };
      }
      return { handled: true as const, clerkUserId, synced: false as const, plan: null };
    }
    case "subscription.pastDue":
    case "subscriptionItem.pastDue":
    case "subscriptionItem.upcoming":
    case "subscriptionItem.incomplete":
    case "subscriptionItem.freeTrialEnding":
    case "paymentAttempt.created":
    case "paymentAttempt.updated":
      // Keep entitlement during dunning / informational events.
      return { handled: true as const, ignored: true as const };
    default:
      return { handled: false as const, reason: "unhandled_event" as const };
  }
}
