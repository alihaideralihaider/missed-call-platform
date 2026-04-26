"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type IpRiskRecord = {
  ip_address: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
  onboarding_count: number;
  watchlist_id: string | null;
  watch_status: string | null;
  watch_reason: string | null;
  watch_notes: string | null;
  watch_updated_at: string | null;
  restaurants: Array<{
    id: string;
    name: string;
    slug: string;
    onboarding_status: string | null;
    created_at: string | null;
  }>;
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

function watchStatusClass(status: string): string {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "blocked") return "bg-red-100 text-red-800";
  if (normalized === "watch") return "bg-yellow-100 text-yellow-800";
  return "bg-neutral-100 text-neutral-700";
}

export default function PlatformIpRiskPage() {
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<IpRiskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [updatingIp, setUpdatingIp] = useState("");
  const [query, setQuery] = useState(() => searchParams.get("query") || "");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationState | null>(null);

  useEffect(() => {
    setQuery(searchParams.get("query") || "");
  }, [searchParams]);

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

      const response = await fetch(`/api/platform/trust/ip-risk?${params}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Failed to load IP risk records.");
        setLoading(false);
        return;
      }

      setRecords(Array.isArray(data?.records) ? data.records : []);
      setPagination(data?.pagination || null);
      setLoading(false);
    } catch {
      setError("Something went wrong while loading IP risk records.");
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords(page, debouncedQuery);
  }, [page, debouncedQuery]);

  const blockedCount = useMemo(
    () =>
      records.filter(
        (record) => String(record.watch_status || "").toLowerCase() === "blocked"
      ).length,
    [records]
  );

  const repeatedCount = useMemo(
    () => records.filter((record) => record.onboarding_count > 1).length,
    [records]
  );

  async function runAction(ipAddress: string, action: string) {
    if (updatingIp) return;

    setActionError("");
    setActionMessage("");
    setUpdatingIp(ipAddress);

    try {
      const response = await fetch(
        `/api/platform/trust/ip-risk/${encodeURIComponent(ipAddress)}`,
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
        setActionError(data?.error || "Failed to update IP risk.");
        setUpdatingIp("");
        return;
      }

      setActionMessage(data?.message || "IP risk updated.");
      setUpdatingIp("");
      await loadRecords(page, debouncedQuery);
    } catch {
      setActionError("Something went wrong while updating IP risk.");
      setUpdatingIp("");
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
            <h1 className="mt-1 text-2xl font-bold text-neutral-900">IP Risk</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Review repeated onboarding IPs, block abusive sources, and keep risky traffic out.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadRecords(page, debouncedQuery)}
            disabled={loading}
            className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh IP risk"}
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
            <p className="text-sm text-neutral-500">Tracked IPs</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {loading ? "—" : records.length}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">Repeated IPs</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {loading ? "—" : repeatedCount}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">Blocked</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {loading ? "—" : blockedCount}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by IP, watch status, reason, restaurant, or slug"
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
          />
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-sm text-neutral-500">Loading IP risk records...</p>
          ) : error ? (
            <div>
              <h2 className="text-lg font-bold text-red-700">Error</h2>
              <p className="mt-2 text-sm text-neutral-600">{error}</p>
            </div>
          ) : records.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No IP risk records match this search.
            </p>
          ) : (
            <div className="space-y-4">
              {records.map((record) => {
                const watchStatus = String(record.watch_status || "").trim().toLowerCase();
                const isUpdating = updatingIp === record.ip_address;

                return (
                  <div
                    key={record.ip_address}
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold text-neutral-900">
                            {record.ip_address}
                          </h2>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${watchStatusClass(
                              record.watch_status || ""
                            )}`}
                          >
                            {record.watch_status || "unlisted"}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1 text-sm text-neutral-600">
                          <p>Onboarding count: {record.onboarding_count}</p>
                          <p>First seen: {formatDateTime(record.first_seen_at)}</p>
                          <p>Last seen: {formatDateTime(record.last_seen_at)}</p>
                          <p>Reason: {record.watch_reason || "—"}</p>
                        </div>
                      </div>

                      <div className="w-full max-w-xs space-y-2">
                        {watchStatus !== "blocked" ? (
                          <button
                            type="button"
                            onClick={() => runAction(record.ip_address, "block")}
                            disabled={isUpdating}
                            className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 disabled:opacity-60"
                          >
                            Block IP
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => runAction(record.ip_address, "unblock")}
                            disabled={isUpdating}
                            className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            Move to watch
                          </button>
                        )}

                        {watchStatus !== "watch" ? (
                          <button
                            type="button"
                            onClick={() => runAction(record.ip_address, "watch")}
                            disabled={isUpdating}
                            className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-700 disabled:opacity-60"
                          >
                            Add to watchlist
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => runAction(record.ip_address, "clear")}
                            disabled={isUpdating}
                            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 disabled:opacity-60"
                          >
                            Clear watchlist entry
                          </button>
                        )}
                      </div>
                    </div>

                    {record.restaurants.length > 0 ? (
                      <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          Related onboardings
                        </p>
                        <div className="mt-3 space-y-2">
                          {record.restaurants.slice(0, 5).map((restaurant) => (
                            <div
                              key={restaurant.id}
                              className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600"
                            >
                              <span>
                                {restaurant.name} ({restaurant.slug})
                              </span>
                              <span>
                                {restaurant.onboarding_status || "—"} •{" "}
                                {formatDateTime(restaurant.created_at)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
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
