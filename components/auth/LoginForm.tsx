"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { FaArrowRight, FaLock, FaUser } from "react-icons/fa";

type LoginFormProps = {
  nextPath: string;
};

type LoginResponse =
  | {
      success: true;
      redirectTo: string;
    }
  | {
      success: false;
      error: string;
    };

const LoginPersonScene = dynamic(
  () =>
    import("@/components/auth/LoginPersonScene").then(
      (module) => module.LoginPersonScene,
    ),
  {
    loading: () => (
      <div
        aria-hidden="true"
        className="h-full w-full animate-pulse bg-[linear-gradient(135deg,rgba(255,255,255,0.58),rgba(219,232,220,0.38),rgba(255,255,255,0.24))]"
      />
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
      <div className="absolute inset-0">
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
          className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(219,232,220,0.72),transparent_32%),radial-gradient(circle_at_78%_22%,rgba(254,243,199,0.42),transparent_28%),radial-gradient(circle_at_62%_86%,rgba(224,242,254,0.5),transparent_30%)]"
        />
      </div>

      <div
        aria-label="Interactive walking person model"
        className="relative h-full w-full cursor-grab active:cursor-grabbing"
      >
        <LoginPersonScene />
      </div>
    </motion.section>
  );
});

function CredentialsCard({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nextPath,
          password,
          username,
        }),
      });
      const payload = (await response.json()) as LoginResponse;

      if (!response.ok || !payload.success) {
        throw new Error(
          "error" in payload ? payload.error : "Unable to sign in.",
        );
      }

      router.push(payload.redirectTo);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to sign in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.section
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="rounded-lg border border-border bg-panel/92 p-5 shadow-[0_24px_80px_rgba(17,17,17,0.08)] backdrop-blur sm:p-6"
      initial={{ opacity: 0, scale: 0.97, y: 16 }}
      transition={{
        delay: 0.12,
        duration: 0.48,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <div className="mb-6">
        <p className="text-sm font-semibold text-accent">Welcome back</p>
        <h2 className="mt-2 text-2xl font-semibold text-text">
          Sign in
        </h2>
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-1.5 text-sm font-medium text-text">
          Username
          <span className="relative">
            <FaUser
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            />
            <input
              autoComplete="username"
              className="h-11 w-full rounded-md border border-border bg-panel pl-9 pr-3 text-sm font-normal text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
              onChange={(event) => {
                setUsername(event.target.value.trim().toLowerCase());
                setError("");
              }}
              value={username}
            />
          </span>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-text">
          Password
          <span className="relative">
            <FaLock
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            />
            <input
              autoComplete="current-password"
              className="h-11 w-full rounded-md border border-border bg-panel pl-9 pr-3 text-sm font-normal text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              type="password"
              value={password}
            />
          </span>
        </label>

        <div className="min-h-5">
          {error ? (
            <p className="text-sm font-medium text-danger">{error}</p>
          ) : null}
        </div>

        <button
          className="group inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-accent-contrast transition hover:bg-accent/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Signing in..." : "Continue"}
          <FaArrowRight
            aria-hidden="true"
            className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
          />
        </button>
      </form>
    </motion.section>
  );
}

export function LoginForm({ nextPath }: LoginFormProps) {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-app px-4 py-6 text-text sm:px-6 lg:px-8">
      <motion.div
        aria-hidden="true"
        animate={{
          backgroundPosition: ["0px 0px", "32px 24px"],
        }}
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(rgba(68,64,60,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(68,64,60,0.055) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        transition={{
          duration: 18,
          ease: "linear",
          repeat: Infinity,
          repeatType: "reverse",
        }}
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
            className="max-w-xl"
            initial={{ opacity: 0, y: 14 }}
            transition={{
              delay: 0.08,
              duration: 0.48,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <h1 className="text-4xl font-semibold leading-none text-text sm:text-5xl lg:text-5xl">
              Return to your quiet record of movement.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-muted">
              Pick up where you left off with your workouts, progress, and
              personal rhythm.
            </p>
          </motion.div>

          <CredentialsCard nextPath={nextPath} />
        </div>
      </div>
    </main>
  );
}
