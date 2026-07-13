"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import Loader from "./loading";

export default function AuthContinuePage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const isResolving = useRef(false);

  useEffect(() => {
    if (!isLoaded || isResolving.current) return;
    isResolving.current = true;

    if (!isSignedIn) {
      window.location.replace("/login");
      return;
    }

    void (async () => {
      try {
        await getToken({ skipCache: true });
      } finally {
        // Use a document navigation so the server sees the newly-created Clerk
        // session instead of racing it through the current RSC transition.
        window.location.replace("/auth/resolve");
      }
    })();
  }, [getToken, isLoaded, isSignedIn]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6" aria-live="polite">
      <Loader />
    </main>
  );
}
