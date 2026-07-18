import { useAuth } from "@clerk/clerk-expo";
import { useCallback, useRef } from "react";

/**
 * Stable getToken wrapper — Clerk's useAuth().getToken changes identity often,
 * which breaks useCallback/useEffect dependency arrays and causes refresh loops.
 */
export function useStableGetToken() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  return useCallback((...args: Parameters<typeof getToken>) => getTokenRef.current(...args), []);
}
