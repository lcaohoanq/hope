"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { FaCreditCard, FaSignOutAlt } from "react-icons/fa";
import { translations } from "@/lib/i18n";
import { isProPlan, type PublicAppUser } from "@/lib/users";

export function AccountSettings({ user }: { user: PublicAppUser }) {
  const { has } = useAuth();
  const { signOut } = useClerk();
  const copy = translations[user.preferredLanguage];
  const showPro = isProPlan(user) || Boolean(has?.({ plan: "pro" }));
  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-border bg-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <FaCreditCard aria-hidden="true" />
              <h3>{copy.profileSettings.planTitle}</h3>
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              {copy.profileSettings.planDescription}
            </p>
            <p className="mt-3 text-sm font-semibold">
              {showPro ? copy.profileSettings.planPro : copy.profileSettings.planStandard}
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-contrast transition hover:bg-accent/90"
            href="/pricing"
          >
            {showPro ? copy.profileSettings.manageBilling : copy.profileSettings.upgradeToPro}
          </Link>
        </div>
      </section>
      <section className="rounded-lg border border-border bg-panel p-5 sm:p-6">
        <button
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-danger px-4 text-sm font-semibold text-white transition hover:bg-danger/90"
          onClick={() => void signOut({ redirectUrl: "/login" })}
          type="button"
        >
          <FaSignOutAlt aria-hidden="true" />
          {copy.common.signOut}
        </button>
      </section>
    </div>
  );
}
