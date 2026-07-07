import { notFound } from "next/navigation";
import { FitnessDashboard } from "@/components/FitnessDashboard";
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
      title: "Fitness Tracker",
    };
  }

  return {
    title: `${user.displayName} - Fitness Tracker`,
  };
}

export default async function UserPage({ params }: UserPageProps) {
  const { userSlug } = await params;
  const user = getUserBySlug(userSlug);

  if (!user) {
    notFound();
  }

  return <FitnessDashboard user={user} />;
}
