"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type DetailRecord = {
  id: string;
  name: string;
  slug: string;
  contact_email: string | null;
  contact_phone: string | null;
  onboarding_status: string | null;
  onboarding_source_ip: string | null;
  onboarding_user_agent: string | null;
  is_active: boolean | null;
  created_at: string | null;
  business: {
    id: string;
    restaurant_id: string;
    status: string | null;
    created_at: string | null;
  } | null;
  memberships: Array<{
    id: string;
    auth_user_id: string | null;
    role: string | null;
    is_active: boolean | null;
    phone_verified: boolean | null;
    onboarding_status: string | null;
  }>;
  ip_watchlist: {
    id: string;
    ip_address: string;
    status: string | null;
    reason: string | null;
    notes: string | null;
    updated_at: string | null;
  } | null;
  activities: Array<{
    id: string;
    entity_type: string;
    entity_id: string | null;
    event_type: string;
    actor_type: string | null;
    actor_user_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string | null;
  }>;
};

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function humanize(value: string): string {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function badgeClass(status: string): string {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "active") return "bg-green-100 text-green-800";
  if (normalized === "suspended") return "bg-red-100 text-red-800";
  if (normalized === "inactive") return "bg-neutral-200 text-neutral-800";
  if (normalized === "blocked") return "bg-red-100 text-red-800";
  if (normalized === "watch") return "bg-yellow-100 text-yellow-800";
  return "bg-neutral-100 text-neutral-700";
}

export default function PlatformRestaurantDetailPage() {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = String(params?.restaurantId || "");
  const [record, setRecord] = useState<DetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [updating, setUpdating] = useState(false);

  async function loadRecord(id: string) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/platform/trust/restaurants/${id}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Failed to load restaurant detail.");
        setLoading(false);
        return;
      }

      setRecord(data?.record || null);
      setLoading(false);
    } catch {
      setError("Something went wrong while loading restaurant detail.");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (restaurantId) {
      loadRecord(restaurantId);
    }
  }, [restaurantId]);

  const businessStatus = String(record?.business?.status || "").trim().toLowerCase();
  const canSuspend = businessStatus === "active";
  const canReactivate = businessStatus === "suspended" || businessStatus === "inactive";

  const ownerMemberships = useMemo(
    () =>
      (record?.memberships || []).filter(
        (membership) => String(membership.role || "").toLowerCase() === "owner"
      ),
    [record]
  );

  async function runAction(action: string) {
    if (!restaurantId || updating) return;

    setActionError("");
    setActionMessage("");
    setUpdating(true);

    try {
      const response = await fetch(
        `/api/platform/trust/restaurants/${restaurantId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        setActionError(data?.error || "Failed to update restaurant.");
        setUpdating(false);
        return;
      }

      setActionMessage(data?.message || "Restaurant updated.");
      setUpdating(false);
      await loadRecord(restaurantId);
    } catch {
      setActionError("Something went wrong while updating restaurant.");
      setUpdating(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/platform/trust/restaurants"
              className="text-sm font-semibold text-neutral-600"
            >
              Back to Restaurant Controls
            </Link>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Trust & Operations
            </p>
            <h1 className="mt-1 text-2xl font-bold text-neutral-900">
              {record?.name || "Restaurant Detail"}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Review onboarding, business status, owner access, IP risk, and recent platform actions in one place.
            </p>
          </div>

          {restaurantId ? (
            <button
              type="button"
              onClick={() => loadRecord(restaurantId)}
              disabled={loading}
              className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh record"}
            </button>
          ) : null}
        </div>

        {actionError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {actionMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-neutral-500">Loading restaurant detail...</p>
          </div>
        ) : error || !record ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-red-700">Error</h2>
            <p className="mt-2 text-sm text-neutral-600">
              {error || "Restaurant detail could not be loaded."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-neutral-500">Business status</p>
                <div className="mt-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(
                      record.business?.status || ""
                    )}`}
                  >
                    {record.business?.status || "unknown"}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-neutral-500">Onboarding</p>
                <p className="mt-2 text-lg font-bold text-neutral-900">
                  {record.onboarding_status || "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-neutral-500">Restaurant active</p>
                <p className="mt-2 text-lg font-bold text-neutral-900">
                  {record.is_active ? "Yes" : "No"}
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(300px,1fr)]">
              <div className="space-y-6">
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-neutral-900">Profile</h2>
                  <div className="mt-4 space-y-2 text-sm text-neutral-600">
                    <p>Slug: {record.slug}</p>
                    <p>Email: {record.contact_email || "—"}</p>
                    <p>Phone: {record.contact_phone || "—"}</p>
                    <p>Created: {formatDateTime(record.created_at)}</p>
                    <p>Onboarding IP: {record.onboarding_source_ip || "—"}</p>
                  </div>

                  {record.onboarding_user_agent ? (
                    <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        User agent
                      </p>
                      <p className="mt-2 break-all text-xs text-neutral-600">
                        {record.onboarding_user_agent}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-neutral-900">Owner Access</h2>
                  <div className="mt-4 space-y-3">
                    {ownerMemberships.length === 0 ? (
                      <p className="text-sm text-neutral-500">No owner memberships found.</p>
                    ) : (
                      ownerMemberships.map((membership) => (
                        <div
                          key={membership.id}
                          className="rounded-xl border border-neutral-200 bg-neutral-50 p-4"
                        >
                          <div className="space-y-1 text-sm text-neutral-600">
                            <p>Auth user: {membership.auth_user_id || "—"}</p>
                            <p>Role: {membership.role || "—"}</p>
                            <p>Access active: {membership.is_active ? "yes" : "no"}</p>
                            <p>
                              Phone verified: {membership.phone_verified ? "yes" : "no"}
                            </p>
                            <p>Onboarding status: {membership.onboarding_status || "—"}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-neutral-900">Recent Platform Activity</h2>
                  <div className="mt-4 space-y-3">
                    {record.activities.length === 0 ? (
                      <p className="text-sm text-neutral-500">
                        No platform activity found for this restaurant yet.
                      </p>
                    ) : (
                      record.activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="rounded-xl border border-neutral-200 bg-neutral-50 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-neutral-900">
                              {humanize(activity.event_type)}
                            </p>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(
                                activity.entity_type
                              )}`}
                            >
                              {activity.entity_type}
                            </span>
                          </div>
                          <div className="mt-2 space-y-1 text-sm text-neutral-600">
                            <p>When: {formatDateTime(activity.created_at)}</p>
                            <p>Actor: {activity.actor_type || "—"}</p>
                            <p>Actor user: {activity.actor_user_id || "—"}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-neutral-900">Actions</h2>
                  <div className="mt-4 space-y-2">
                    {canSuspend ? (
                      <button
                        type="button"
                        onClick={() => runAction("suspend")}
                        disabled={updating}
                        className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-700 disabled:opacity-60"
                      >
                        Suspend restaurant
                      </button>
                    ) : null}

                    {canReactivate ? (
                      <button
                        type="button"
                        onClick={() => runAction("reactivate")}
                        disabled={updating}
                        className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        Reactivate restaurant
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => runAction("close")}
                      disabled={updating}
                      className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 disabled:opacity-60"
                    >
                      Close restaurant
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-neutral-900">IP Watchlist</h2>
                  <div className="mt-4 space-y-2 text-sm text-neutral-600">
                    <p>IP: {record.onboarding_source_ip || "—"}</p>
                    <p>
                      Status:{" "}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(
                          record.ip_watchlist?.status || ""
                        )}`}
                      >
                        {record.ip_watchlist?.status || "unlisted"}
                      </span>
                    </p>
                    <p>Reason: {record.ip_watchlist?.reason || "—"}</p>
                    <p>Updated: {formatDateTime(record.ip_watchlist?.updated_at)}</p>
                    {record.onboarding_source_ip ? (
                      <Link
                        href={`/platform/trust/ip-risk?query=${encodeURIComponent(
                          record.onboarding_source_ip
                        )}`}
                        className="inline-flex text-sm font-semibold text-neutral-900"
                      >
                        Open in IP Risk
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
