"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect } from "react";

/**
 * Clears a Clerk browser session that the Hope API cannot verify (wrong secret,
 * stale keyless cookie, or zombie API process), then returns to a clean login.
 */
export function SessionMismatchClient() {
  const { signOut } = useClerk();

  useEffect(() => {
    void signOut({ redirectUrl: "/login" });
  }, [signOut]);

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-app px-4 text-text">
      <p className="text-sm text-muted">Resetting session…</p>
    </main>
  );
}
