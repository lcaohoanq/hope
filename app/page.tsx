import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, getAuthenticatedUser } from "@/lib/auth";

export default async function Home() {
  const cookieStore = await cookies();
  const authenticatedUser = getAuthenticatedUser(
    cookieStore.get(AUTH_COOKIE_NAME)?.value,
  );

  redirect(authenticatedUser ? `/${authenticatedUser.slug}` : "/login");
}
