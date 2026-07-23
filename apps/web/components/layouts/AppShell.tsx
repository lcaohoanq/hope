"use client";

import { usePathname } from "next/navigation";
import { AppFooter } from "@/components/layouts/AppFooter";
import { NavigationProgress } from "@/components/shared/NavigationProgress";

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
      <NavigationProgress />
      {children}
      {shouldShowFooter ? <AppFooter /> : null}
    </>
  );
}
