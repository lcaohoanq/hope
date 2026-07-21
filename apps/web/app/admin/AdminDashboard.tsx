"use client";

import { useAuth } from "@clerk/nextjs";
import type { ActivityType, UserRole } from "@hope/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { AdminOverview } from "@/lib/admin";
import { getClientApiClient, parseApiJson } from "@/lib/http";

async function fetchOverview(): Promise<AdminOverview> {
  try {
    const response = await fetch("/api/admin/overview", {
      signal: AbortSignal.timeout(15_000),
    });
    const payload = (await response.json().catch(() => null)) as
      | (AdminOverview & { error?: string })
      | null;
    if (!response.ok || !payload) {
      throw new Error(payload?.error ?? "Could not load the admin overview.");
    }
    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("The admin overview took too long to load. Please retry.");
    }
    throw error;
  }
}

type ActivityTypeForm = {
  slug: string;
  labelEn: string;
  labelVi: string;
  weight: string;
  sortOrder: string;
};

type ActivityTypesResponse = { success: true; activityTypes: ActivityType[] };
type ActivityTypeMutationResponse = { success: true; activityType: ActivityType };
type RecomputeResponse = { success: true; updated: number };
type ErrorResponse = { success?: boolean; error?: string };

const emptyForm: ActivityTypeForm = {
  slug: "",
  labelEn: "",
  labelVi: "",
  weight: "1",
  sortOrder: "0",
};

function getPayloadError(payload: unknown, fallback: string) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return fallback;
}

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const [form, setForm] = useState<ActivityTypeForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const overview = useQuery({ queryKey: ["admin", "overview"], queryFn: fetchOverview });
  const activityTypes = useQuery({
    queryKey: ["admin", "activity-types"],
    queryFn: async () => {
      const token = await getToken();
      const client = getClientApiClient(token);
      const res = await client["activity-types"].$get({ query: { includeInactive: "true" } });
      const payload = await parseApiJson<ActivityTypesResponse | ErrorResponse>(res);
      if (!res.ok || !("activityTypes" in payload)) {
        throw new Error(getPayloadError(payload, "Could not load activity types."));
      }
      return payload.activityTypes;
    },
  });

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

  const saveType = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const client = getClientApiClient(token);
      const body = {
        slug: form.slug.trim().toLowerCase(),
        label: { en: form.labelEn.trim(), vi: form.labelVi.trim() },
        weight: Number(form.weight),
        sortOrder: Number(form.sortOrder),
      };

      if (editingId) {
        const res = await client["activity-types"][":id"].$patch({
          param: { id: editingId },
          json: {
            label: body.label,
            weight: body.weight,
            sortOrder: body.sortOrder,
          },
        });
        const payload = await parseApiJson<ActivityTypeMutationResponse | ErrorResponse>(res);
        if (!res.ok) {
          throw new Error(getPayloadError(payload, "Could not update activity type."));
        }
        return;
      }

      const res = await client["activity-types"].$post({ json: body });
      const payload = await parseApiJson<ActivityTypeMutationResponse | ErrorResponse>(res);
      if (!res.ok) {
        throw new Error(getPayloadError(payload, "Could not create activity type."));
      }
    },
    onSuccess: async () => {
      setForm(emptyForm);
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "activity-types"] });
    },
  });

  const deactivateType = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      const client = getClientApiClient(token);
      const res = await client["activity-types"][":id"].$delete({ param: { id } });
      const payload = await parseApiJson<ActivityTypeMutationResponse | ErrorResponse>(res);
      if (!res.ok) {
        throw new Error(getPayloadError(payload, "Could not deactivate activity type."));
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "activity-types"] }),
  });

  const recomputePoints = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const client = getClientApiClient(token);
      const res = await client["activity-types"]["recompute-points"].$post({});
      const payload = await parseApiJson<RecomputeResponse | ErrorResponse>(res);
      if (!res.ok || !("updated" in payload)) {
        throw new Error(getPayloadError(payload, "Could not recompute points."));
      }
      return payload;
    },
  });

  if (overview.isPending) return <p className="text-sm text-muted">Loading admin overview…</p>;
  if (overview.isError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{overview.error.message}</p>
        <button
          className="h-9 rounded-md border border-border px-4 text-sm font-semibold text-muted disabled:opacity-60"
          disabled={overview.isFetching}
          onClick={() => overview.refetch()}
          type="button"
        >
          {overview.isFetching ? "Retrying…" : "Retry"}
        </button>
      </div>
    );
  }

  const data = overview.data;
  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2">
        <Metric label="Profiles" value={data.metrics.profiles} />
        <Metric label="Workouts" value={data.metrics.workouts} />
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-panel">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">Activity types</h2>
          <p className="mt-1 text-sm text-muted">
            Manage scoring weights. New workouts snapshot the current weight; use recompute to
            rewrite history.
          </p>
        </div>

        <div className="grid gap-3 border-b border-border px-5 py-4 sm:grid-cols-2 lg:grid-cols-5">
          <input
            className="rounded-md border border-border bg-app px-3 py-2 text-sm"
            disabled={Boolean(editingId)}
            onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
            placeholder="slug"
            value={form.slug}
          />
          <input
            className="rounded-md border border-border bg-app px-3 py-2 text-sm"
            onChange={(event) =>
              setForm((current) => ({ ...current, labelEn: event.target.value }))
            }
            placeholder="Label (en)"
            value={form.labelEn}
          />
          <input
            className="rounded-md border border-border bg-app px-3 py-2 text-sm"
            onChange={(event) =>
              setForm((current) => ({ ...current, labelVi: event.target.value }))
            }
            placeholder="Label (vi)"
            value={form.labelVi}
          />
          <input
            className="rounded-md border border-border bg-app px-3 py-2 text-sm"
            onChange={(event) => setForm((current) => ({ ...current, weight: event.target.value }))}
            placeholder="weight"
            type="number"
            value={form.weight}
          />
          <input
            className="rounded-md border border-border bg-app px-3 py-2 text-sm"
            onChange={(event) =>
              setForm((current) => ({ ...current, sortOrder: event.target.value }))
            }
            placeholder="sort"
            type="number"
            value={form.sortOrder}
          />
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-5">
            <button
              className="h-9 rounded-md bg-accent px-4 text-sm font-semibold text-accent-contrast disabled:opacity-60"
              disabled={saveType.isPending}
              onClick={() => saveType.mutate()}
              type="button"
            >
              {editingId ? "Update type" : "Add type"}
            </button>
            {editingId ? (
              <button
                className="h-9 rounded-md border border-border px-4 text-sm font-semibold text-muted"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
                type="button"
              >
                Cancel
              </button>
            ) : null}
            <button
              className="h-9 rounded-md border border-border px-4 text-sm font-semibold text-muted disabled:opacity-60"
              disabled={recomputePoints.isPending}
              onClick={() => recomputePoints.mutate()}
              type="button"
            >
              Recompute all points
            </button>
          </div>
          {saveType.isError ? (
            <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-5">
              {saveType.error.message}
            </p>
          ) : null}
          {deactivateType.isError ? (
            <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-5">
              {deactivateType.error.message}
            </p>
          ) : null}
          {recomputePoints.isSuccess ? (
            <p className="text-sm text-muted sm:col-span-2 lg:col-span-5">
              Recomputed {recomputePoints.data.updated} workouts.
            </p>
          ) : null}
        </div>

        {activityTypes.isPending ? (
          <p className="px-5 py-4 text-sm text-muted">Loading activity types…</p>
        ) : activityTypes.isError ? (
          <p className="px-5 py-4 text-sm text-red-600">{activityTypes.error.message}</p>
        ) : (
          <ul className="divide-y divide-border">
            {activityTypes.data.map((type) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                key={type.id}
              >
                <div>
                  <p className="font-medium">
                    {type.label.en} / {type.label.vi}
                    {!type.isActive ? (
                      <span className="ml-2 text-xs font-semibold uppercase text-muted">
                        inactive
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted">
                    {type.slug} · weight {type.weight} · sort {type.sortOrder}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="h-8 rounded-md border border-border px-3 text-xs font-semibold"
                    onClick={() => {
                      setEditingId(type.id);
                      setForm({
                        slug: type.slug,
                        labelEn: type.label.en,
                        labelVi: type.label.vi,
                        weight: String(type.weight),
                        sortOrder: String(type.sortOrder),
                      });
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  {type.isActive ? (
                    <button
                      className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-red-700"
                      disabled={deactivateType.isPending}
                      onClick={() => deactivateType.mutate(type.id)}
                      type="button"
                    >
                      Deactivate
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
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
