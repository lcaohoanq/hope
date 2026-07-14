import type { ReactNode } from "react";
import { AppClerkProvider } from "@/components/auth/AppClerkProvider";

export default function AuthRouteLayout({ children }: { children: ReactNode }) {
  return <AppClerkProvider>{children}</AppClerkProvider>;
}
