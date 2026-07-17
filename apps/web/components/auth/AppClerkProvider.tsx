"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

type AppClerkProviderProps = {
  children: ReactNode;
};

export function AppClerkProvider({ children }: AppClerkProviderProps) {
  // Must read process.env.NEXT_PUBLIC_* inline so Next/Turbopack can replace it.
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY. Put Clerk keys in the repo-root .env/.env.local (loaded via next.config.ts) or apps/web/.env.local.",
    );
  }

  return (
    <ClerkProvider
      afterSignOutUrl="/"
      publishableKey={publishableKey}
      signInUrl="/login"
      signUpUrl="/sign-up"
    >
      {children}
    </ClerkProvider>
  );
}
