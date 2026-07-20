import { auth } from "@clerk/nextjs/server";
import { forbidden, redirect } from "next/navigation";
import { isAdminClerkUserId } from "@/lib/admin";
import { AdminDashboard } from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login?next=/admin");
  if (!(await isAdminClerkUserId(userId))) forbidden();

  return (
    <main className="min-h-dvh bg-app px-4 py-8 text-text sm:px-6">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-medium text-muted">Hope operations</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-2 mb-8 text-muted">A private overview of your community and activity.</p>
        <AdminDashboard />
      </div>
    </main>
  );
}
