import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { HopeDashboard } from "@/components/dashboard/HopeDashboard";
import { AUTH_COOKIE_NAME, getAuthenticatedUser } from "@/lib/auth";
import {
  APP_USERS,
  getCanonicalUserPath,
  getUserByProfilePath,
  toPublicUser,
} from "@/lib/users";

type UserPageProps = {
  params: Promise<{
    userSlug: string;
  }>;
};

export function generateStaticParams() {
  return APP_USERS.map((user) => ({
    userSlug: user.credentials.username,
  }));
}

export async function generateMetadata({ params }: UserPageProps) {
  const { userSlug } = await params;
  const user = getUserByProfilePath(userSlug);

  if (!user) {
    return {
      title: "Hope",
    };
  }

  return {
    title: `${user.displayName} - Hope`,
  };
}

export default async function UserPage({ params }: UserPageProps) {
  const { userSlug } = await params;
  const user = getUserByProfilePath(userSlug);
  const cookieStore = await cookies();
  const authenticatedUser = getAuthenticatedUser(
    cookieStore.get(AUTH_COOKIE_NAME)?.value,
  );

  if (!user) {
    notFound();
  }

  if (`/${userSlug}` !== getCanonicalUserPath(user)) {
    redirect(getCanonicalUserPath(user));
  }

  return (
    <HopeDashboard
      isAuthenticated={Boolean(authenticatedUser)}
      isEditable={authenticatedUser?.id === user.id}
      key={user.id}
      user={toPublicUser(user)}
    />
  );
}
