import { notFound } from "next/navigation";
import { HopeDashboard } from "@/components/HopeDashboard";
import { APP_USERS, getUserBySlug } from "@/lib/users";

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

  if (!user) {
    notFound();
  }

  return <HopeDashboard user={user} />;
}
