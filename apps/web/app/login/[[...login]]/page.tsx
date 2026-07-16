import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Sign in - Hope" };

export default async function LoginPage() {
  const { userId } = await auth();
  if (userId) redirect("/auth/continue");
  return <LoginForm mode="sign-in" />;
}
