"use client";

import { memo, type ReactNode } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

type AuthLayoutProps = {
  children: ReactNode;
};

const LoginPersonScene = dynamic(
  () => import("@/components/auth/LoginPersonScene").then((module) => module.LoginPersonScene),
  {
    loading: () => <div aria-hidden="true" className="h-full w-full animate-pulse bg-panel-muted" />,
    ssr: false,
  },
);

const LoginSceneStage = memo(function LoginSceneStage() {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="relative h-[430px] overflow-hidden rounded-lg border border-border bg-panel/68 shadow-[0_24px_90px_rgba(17,17,17,0.07)] backdrop-blur sm:h-[520px] lg:h-[100dvh] lg:min-h-[100dvh] lg:rounded-none lg:border-y-0 lg:border-l-0"
      initial={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-55"
        style={{
          backgroundImage:
            "linear-gradient(rgba(87,83,78,0.075) 1px, transparent 1px), linear-gradient(90deg, rgba(87,83,78,0.075) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(219,232,220,0.72),transparent_32%),radial-gradient(circle_at_78%_22%,rgba(254,243,199,0.42),transparent_28%)]"
      />
      <div
        aria-label="Interactive walking person model"
        className="relative h-full w-full cursor-grab active:cursor-grabbing"
      >
        <LoginPersonScene />
      </div>
    </motion.section>
  );
});

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-app px-4 py-6 text-text sm:px-6 lg:p-0">
      <motion.div
        aria-hidden="true"
        animate={{ backgroundPosition: ["0px 0px", "32px 24px"] }}
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(rgba(68,64,60,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(68,64,60,0.055) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        transition={{ duration: 18, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.74),rgba(247,245,240,0.2)_42%,rgba(247,245,240,0.88)_78%)]"
      />
      <div className="relative mx-auto grid min-h-[calc(100dvh-48px)] max-w-7xl items-center gap-8 lg:mx-0 lg:min-h-[100dvh] lg:max-w-none lg:items-stretch lg:grid-cols-[minmax(0,1fr)_minmax(420px,480px)] xl:grid-cols-[minmax(760px,1fr)_500px]">
        <LoginSceneStage />
        <div className="grid gap-6 lg:self-center lg:py-8 lg:pr-8 xl:pr-12">{children}</div>
      </div>
    </main>
  );
}
