import type { ReactNode } from "react";
import { AppClerkProvider } from "@/components/auth/AppClerkProvider";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <AppClerkProvider>{children}</AppClerkProvider>;
}
