import { useAuth } from "@clerk/clerk-expo";
import type { PublicAppUser } from "@hope/shared";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type OwnerResolution, resolveOwner } from "@/lib/session";

type SessionState = {
  status: OwnerResolution["status"] | "loading";
  user: PublicAppUser | null;
  refresh: () => Promise<void>;
  setUser: (user: PublicAppUser | null) => void;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const [status, setStatus] = useState<SessionState["status"]>("loading");
  const [user, setUser] = useState<PublicAppUser | null>(null);

  // Clerk's getToken/signOut identities are unstable across renders — keep refs
  // so refresh() does not recreate and re-trigger the bootstrap effect forever.
  const getTokenRef = useRef(getToken);
  const signOutRef = useRef(signOut);
  getTokenRef.current = getToken;
  signOutRef.current = signOut;

  const refresh = useCallback(async () => {
    if (!isLoaded) {
      setStatus("loading");
      return;
    }
    if (!isSignedIn) {
      setUser(null);
      setStatus("signed-out");
      return;
    }

    // Soft refresh: keep current UI mounted when we already resolved once.
    setStatus((current) => (current === "ready" || current === "onboarding" ? current : "loading"));

    const token = await getTokenRef.current();
    const resolution = await resolveOwner(token);

    if (resolution.status === "session_mismatch") {
      await signOutRef.current();
      setUser(null);
      setStatus("signed-out");
      return;
    }

    if (resolution.status === "ready") {
      setUser(resolution.user);
      setStatus("ready");
      return;
    }

    setUser(null);
    setStatus(resolution.status);
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ status, user, refresh, setUser }), [status, user, refresh]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
