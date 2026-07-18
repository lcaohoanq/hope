"use client";

import { usePathname } from "next/navigation";
import { AppFooter } from "@/components/layouts/AppFooter";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const shouldShowFooter =
    pathname !== "/" &&
    !["/login", "/sign-up", "/onboarding", "/auth/continue"].some((path) =>
      pathname.startsWith(path),
    );

  return (
    <>
      {children}
      {shouldShowFooter ? <AppFooter /> : null}
    </>
  );
}
