import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { SessionMismatchClient } from "@/components/auth/SessionMismatchClient";

export const metadata = { title: "Sign in - Hope" };

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const { userId } = await auth();

  // Break continue↔resolve loops when Next has a session but the API rejects the JWT.
  if (error === "session_mismatch") {
    return <SessionMismatchClient />;
  }

  if (userId) redirect("/auth/continue");
  return <LoginForm mode="sign-in" />;
}
