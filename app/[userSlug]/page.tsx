import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { HopeDashboard } from "@/components/HopeDashboard";
import { AUTH_COOKIE_NAME, getAuthenticatedUser } from "@/lib/auth";
import { APP_USERS, getUserBySlug, toPublicUser } from "@/lib/users";

type UserPageProps = {
  params: Promise<{
    userSlug: string;
  }>;
};

export function generateStaticParams() {
  return APP_USERS.map((user) => ({
    userSlug: user.slug,
  }));
}

export async function generateMetadata({ params }: UserPageProps) {
  const { userSlug } = await params;
  const user = getUserBySlug(userSlug);

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
  const user = getUserBySlug(userSlug);
  const cookieStore = await cookies();
  const authenticatedUser = getAuthenticatedUser(
    cookieStore.get(AUTH_COOKIE_NAME)?.value,
  );

  if (!user) {
    notFound();
  }

  if (!authenticatedUser) {
    redirect(`/login?next=/${encodeURIComponent(user.slug)}`);
  }

  if (authenticatedUser.id !== user.id) {
    redirect(`/${authenticatedUser.slug}`);
  }

  return <HopeDashboard key={user.id} user={toPublicUser(user)} />;
}
