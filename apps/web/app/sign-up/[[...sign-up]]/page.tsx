import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Create account - Hope" };

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) redirect("/auth/continue");
  return <LoginForm mode="sign-up" />;
}
