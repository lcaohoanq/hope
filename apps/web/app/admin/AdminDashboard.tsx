"use client";

import type { UserRole } from "@hope/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminOverview } from "@/lib/admin";

async function fetchOverview(): Promise<AdminOverview> {
  const response = await fetch("/api/admin/overview");
  if (!response.ok) throw new Error("Could not load the admin overview.");
  return response.json() as Promise<AdminOverview>;
}

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const overview = useQuery({ queryKey: ["admin", "overview"], queryFn: fetchOverview });
  const updateRole = useMutation({
    mutationFn: async ({ profileId, role }: { profileId: string; role: UserRole }) => {
      const response = await fetch(`/api/admin/profiles/${profileId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Could not update the role.");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "overview"] }),
  });

  if (overview.isPending) return <p className="text-sm text-muted">Loading admin overview…</p>;
  if (overview.isError) return <p className="text-sm text-red-600">{overview.error.message}</p>;

  const data = overview.data;
  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2">
        <Metric label="Profiles" value={data.metrics.profiles} />
        <Metric label="Workouts" value={data.metrics.workouts} />
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-panel">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">Recent profiles</h2>
          <p className="mt-1 text-sm text-muted">Choose who can access Hope administration.</p>
        </div>
        <ul className="divide-y divide-border">
          {data.recentProfiles.map((profile) => (
            <li className="flex items-center justify-between gap-4 px-5 py-4" key={profile.id}>
              <div>
                <p className="font-medium">{profile.displayName}</p>
                <p className="text-sm text-muted">@{profile.username}</p>
              </div>
              <div className="text-right text-sm text-muted">
                <label className="sr-only" htmlFor={`profile-role-${profile.id}`}>
                  Role for {profile.displayName}
                </label>
                <select
                  className="rounded-md border border-border bg-app px-2 py-1 capitalize text-text"
                  defaultValue={profile.role}
                  disabled={updateRole.isPending}
                  id={`profile-role-${profile.id}`}
                  onChange={(event) =>
                    updateRole.mutate({
                      profileId: profile.id,
                      role: event.target.value as UserRole,
                    })
                  }
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="mt-1 capitalize">{profile.plan}</p>
                <p>{new Date(profile.createdAt).toLocaleDateString()}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      {updateRole.isError ? (
        <p className="text-sm text-red-600">{updateRole.error.message}</p>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value.toLocaleString()}</p>
    </div>
  );
}
