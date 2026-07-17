"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

type AppClerkProviderProps = {
  children: ReactNode;
};

export function AppClerkProvider({ children }: AppClerkProviderProps) {
  return (
    <ClerkProvider afterSignOutUrl="/" signInUrl="/login" signUpUrl="/sign-up">
      {children}
    </ClerkProvider>
  );
}
