"use client";

import { createContext, useContext } from "react";
import type { PublicAppUser } from "@/lib/users";

const SocialSessionContext = createContext<PublicAppUser | null>(null);

export function SocialSessionProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user: PublicAppUser;
}) {
  return <SocialSessionContext.Provider value={user}>{children}</SocialSessionContext.Provider>;
}

export function useSocialSession() {
  const user = useContext(SocialSessionContext);
  if (!user) throw new Error("SocialSessionProvider is missing.");
  return user;
}
