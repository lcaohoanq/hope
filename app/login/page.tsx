import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { AUTH_COOKIE_NAME, getAuthenticatedUser, sanitizeNextPath } from "@/lib/auth";
import { APP_USERS, getCanonicalUserPath } from "@/lib/users";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export const metadata = {
  title: "Sign in - Hope",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const cookieStore = await cookies();
  const authenticatedUser = getAuthenticatedUser(
    cookieStore.get(AUTH_COOKIE_NAME)?.value,
  );

  if (authenticatedUser) {
    redirect(getCanonicalUserPath(authenticatedUser));
  }

  const { next } = await searchParams;
  const nextPath = sanitizeNextPath(next) ?? getCanonicalUserPath(APP_USERS[0]);

  return <LoginForm nextPath={nextPath} />;
}
