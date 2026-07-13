"use client";

import { usePathname } from "next/navigation";
import { AppFooter } from "@/components/layouts/AppFooter";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const shouldShowFooter = pathname !== "/login";

  return (
    <>
      {children}
      {shouldShowFooter ? <AppFooter /> : null}
    </>
  );
}
