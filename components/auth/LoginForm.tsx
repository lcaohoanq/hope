"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { memo } from "react";

type LoginFormProps = { mode: "sign-in" | "sign-up" };

const LoginPersonScene = dynamic(
  () => import("@/components/auth/LoginPersonScene").then((module) => module.LoginPersonScene),
  {
    loading: () => (
      <div aria-hidden="true" className="h-full w-full animate-pulse bg-panel-muted" />
    ),
    ssr: false,
  },
);

const LoginSceneStage = memo(function LoginSceneStage() {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="relative h-[430px] overflow-hidden rounded-lg border border-border bg-panel/68 shadow-[0_24px_90px_rgba(17,17,17,0.07)] backdrop-blur sm:h-[520px] lg:h-[min(760px,calc(100dvh-96px))] lg:min-h-[620px]"
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
        role="img"
      >
        <LoginPersonScene />
      </div>
    </motion.section>
  );
});

function ClerkAuthCard({ mode }: LoginFormProps) {
  return mode === "sign-in" ? (
    <SignIn forceRedirectUrl="/auth/continue" signUpUrl="/sign-up" />
  ) : (
    <SignUp forceRedirectUrl="/auth/continue" signInUrl="/login" />
  );
}

export function LoginForm({ mode }: LoginFormProps) {
  const isSignUp = mode === "sign-up";
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-app px-4 py-6 text-text sm:px-6 lg:px-8">
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
      <div className="relative mx-auto grid min-h-[calc(100dvh-48px)] max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,480px)] xl:max-w-[96rem] xl:grid-cols-[minmax(760px,1fr)_500px]">
        <LoginSceneStage />
        <div className="grid gap-6">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 14 }}
            transition={{ delay: 0.08, duration: 0.48 }}
          >
            <h1 className="text-4xl font-semibold leading-none text-text sm:text-5xl">
              {isSignUp
                ? "Begin your quiet record of movement."
                : "Return to your quiet record of movement."}
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-muted">
              {isSignUp
                ? "Create a public profile, then shape your personal timeline."
                : "Sign in with the verification code sent to your email."}
            </p>
          </motion.div>
          <ClerkAuthCard mode={mode} />
        </div>
      </div>
    </main>
  );
}
