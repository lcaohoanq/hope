"use client";

import { createContext, useContext } from "react";
import type { PublicAppUser } from "@/lib/users";

const SettingsSessionContext = createContext<PublicAppUser | null>(null);

export function SettingsSessionProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user: PublicAppUser;
}) {
  return <SettingsSessionContext.Provider value={user}>{children}</SettingsSessionContext.Provider>;
}

export function useSettingsSession() {
  const user = useContext(SettingsSessionContext);
  if (!user) throw new Error("SettingsSessionProvider is missing.");
  return user;
}
