"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RestaurantRecord = {
  id: string;
  name: string;
  slug: string;
  contact_email: string | null;
  contact_phone: string | null;
  onboarding_status: string | null;
  is_active: boolean | null;
  business_status: string | null;
  created_at: string | null;
};

type PaginationState = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
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

function statusClass(status: string): string {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "active") return "bg-green-100 text-green-800";
  if (normalized === "suspended") return "bg-red-100 text-red-800";
  if (normalized === "inactive") return "bg-neutral-200 text-neutral-800";

  return "bg-neutral-100 text-neutral-700";
}

export default function PlatformRestaurantControlsPage() {
  const [records, setRecords] = useState<RestaurantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationState | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  async function loadRecords(nextPage = page, nextQuery = debouncedQuery) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: "20",
      });
      if (nextQuery) {
        params.set("query", nextQuery);
      }

      const response = await fetch(`/api/platform/trust/restaurants?${params}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Failed to load restaurant controls.");
        setLoading(false);
        return;
      }

      setRecords(Array.isArray(data?.records) ? data.records : []);
      setPagination(data?.pagination || null);
      setLoading(false);
    } catch {
      setError("Something went wrong while loading restaurant controls.");
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords(page, debouncedQuery);
  }, [page, debouncedQuery]);

  const suspendedCount = useMemo(
    () =>
      records.filter(
        (record) => String(record.business_status || "").toLowerCase() === "suspended"
      ).length,
    [records]
  );

  async function runAction(restaurantId: string, action: string) {
    if (updatingId) return;

    setActionError("");
    setActionMessage("");
    setUpdatingId(restaurantId);

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
        setActionError(data?.error || "Failed to update restaurant status.");
        setUpdatingId("");
        return;
      }

      setActionMessage(data?.message || "Restaurant status updated.");
      setUpdatingId("");
      await loadRecords(page, debouncedQuery);
    } catch {
      setActionError("Something went wrong while updating restaurant status.");
      setUpdatingId("");
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Trust & Operations
            </p>
            <h1 className="mt-1 text-2xl font-bold text-neutral-900">
              Restaurant Controls
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Suspend, reactivate, or close restaurants independently of onboarding review.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadRecords(page, debouncedQuery)}
            disabled={loading}
            className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh restaurants"}
          </button>
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

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">Tracked restaurants</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {loading ? "—" : records.length}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">Suspended</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {loading ? "—" : suspendedCount}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">Active</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {loading
                ? "—"
                : records.filter(
                    (record) =>
                      String(record.business_status || "").toLowerCase() === "active"
                  ).length}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by restaurant, slug, email, phone, or status"
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
          />
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-sm text-neutral-500">Loading restaurant controls...</p>
          ) : error ? (
            <div>
              <h2 className="text-lg font-bold text-red-700">Error</h2>
              <p className="mt-2 text-sm text-neutral-600">{error}</p>
            </div>
          ) : records.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No restaurants match this search.
            </p>
          ) : (
            <div className="space-y-4">
              {records.map((record) => {
                const businessStatus = String(record.business_status || "")
                  .trim()
                  .toLowerCase();
                const isUpdating = updatingId === record.id;
                const canSuspend = businessStatus === "active";
                const canReactivate =
                  businessStatus === "suspended" || businessStatus === "inactive";

                return (
                  <div
                    key={record.id}
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold text-neutral-900">
                            {record.name}
                          </h2>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              record.business_status || ""
                            )}`}
                          >
                            {record.business_status || "unknown"}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1 text-sm text-neutral-600">
                          <p>Slug: {record.slug}</p>
                          <p>Email: {record.contact_email || "—"}</p>
                          <p>Phone: {record.contact_phone || "—"}</p>
                          <p>Onboarding: {record.onboarding_status || "—"}</p>
                          <p>Restaurant active: {record.is_active ? "yes" : "no"}</p>
                          <p>Created: {formatDateTime(record.created_at)}</p>
                        </div>
                      </div>

                      <div className="w-full max-w-xs space-y-2">
                        <Link
                          href={`/platform/trust/restaurants/${record.id}`}
                          className="flex w-full items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-900"
                        >
                          View details
                        </Link>

                        {canSuspend ? (
                          <button
                            type="button"
                            onClick={() => runAction(record.id, "suspend")}
                            disabled={isUpdating}
                            className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-700 disabled:opacity-60"
                          >
                            Suspend restaurant
                          </button>
                        ) : null}

                        {canReactivate ? (
                          <button
                            type="button"
                            onClick={() => runAction(record.id, "reactivate")}
                            disabled={isUpdating}
                            className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            Reactivate restaurant
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => runAction(record.id, "close")}
                          disabled={isUpdating}
                          className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 disabled:opacity-60"
                        >
                          Close restaurant
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {pagination ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-500">
              Page {pagination.page} of {pagination.total_pages} • {pagination.total} records
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!pagination.has_previous_page || loading}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((current) =>
                    pagination.has_next_page ? current + 1 : current
                  )
                }
                disabled={!pagination.has_next_page || loading}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
