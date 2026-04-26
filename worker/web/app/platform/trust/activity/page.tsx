"use client";

import { useEffect, useMemo, useState } from "react";

type ActivityRecord = {
  id: string;
  entity_type: string;
  entity_id: string | null;
  event_type: string;
  actor_type: string | null;
  actor_user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

type FilterValue = "all" | "restaurant" | "ip";

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

function humanizeEventType(value: string): string {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function typePillClass(value: string): string {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "restaurant") return "bg-blue-100 text-blue-800";
  if (normalized === "ip") return "bg-amber-100 text-amber-800";
  return "bg-neutral-100 text-neutral-700";
}

function readMetadataValue(
  metadata: Record<string, unknown> | null,
  key: string
): string | null {
  const value = metadata?.[key];
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

export default function PlatformActivityPage() {
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
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

  async function loadRecords(nextFilter: FilterValue, nextPage = page, nextQuery = debouncedQuery) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: "20",
      });
      if (nextFilter !== "all") {
        params.set("type", nextFilter);
      }
      if (nextQuery) {
        params.set("query", nextQuery);
      }

      const response = await fetch(`/api/platform/trust/activity?${params}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Failed to load platform activity.");
        setLoading(false);
        return;
      }

      setRecords(Array.isArray(data?.records) ? data.records : []);
      setPagination(data?.pagination || null);
      setLoading(false);
    } catch {
      setError("Something went wrong while loading platform activity.");
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords(filter, page, debouncedQuery);
  }, [filter, page, debouncedQuery]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const restaurantCount = useMemo(
    () =>
      records.filter(
        (record) => String(record.entity_type || "").toLowerCase() === "restaurant"
      ).length,
    [records]
  );

  const ipCount = useMemo(
    () =>
      records.filter((record) => String(record.entity_type || "").toLowerCase() === "ip")
        .length,
    [records]
  );

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Trust & Operations
            </p>
            <h1 className="mt-1 text-2xl font-bold text-neutral-900">Activity</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Review platform actions across onboarding, restaurant controls, and IP risk.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadRecords(filter, page, debouncedQuery)}
            disabled={loading}
            className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh activity"}
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">Recent events</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {loading ? "—" : records.length}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">Restaurant actions</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {loading ? "—" : restaurantCount}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">IP actions</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {loading ? "—" : ipCount}
            </p>
          </div>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto">
          {[
            { value: "all", label: "All" },
            { value: "restaurant", label: "Restaurants" },
            { value: "ip", label: "IP Risk" },
          ].map((item) => {
            const active = filter === item.value;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value as FilterValue)}
                className={
                  active
                    ? "shrink-0 rounded-full bg-neutral-900 px-3 py-2 text-sm font-semibold text-white"
                    : "shrink-0 rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700"
                }
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mb-6">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by event, entity, actor, restaurant slug, IP, or metadata"
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
          />
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-sm text-neutral-500">Loading platform activity...</p>
          ) : error ? (
            <div>
              <h2 className="text-lg font-bold text-red-700">Error</h2>
              <p className="mt-2 text-sm text-neutral-600">{error}</p>
            </div>
          ) : records.length === 0 ? (
            <p className="text-sm text-neutral-500">No platform activity matches this search.</p>
          ) : (
            <div className="space-y-4">
              {records.map((record) => {
                const restaurantSlug = readMetadataValue(
                  record.metadata,
                  "restaurant_slug"
                );
                const onboardingIp = readMetadataValue(
                  record.metadata,
                  "onboarding_source_ip"
                );
                const businessStatus = readMetadataValue(
                  record.metadata,
                  "business_status"
                );
                const onboardingStatus = readMetadataValue(
                  record.metadata,
                  "onboarding_status"
                );

                return (
                  <div
                    key={record.id}
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold text-neutral-900">
                            {humanizeEventType(record.event_type)}
                          </h2>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${typePillClass(
                              record.entity_type
                            )}`}
                          >
                            {record.entity_type}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1 text-sm text-neutral-600">
                          <p>When: {formatDateTime(record.created_at)}</p>
                          <p>Actor: {record.actor_type || "—"}</p>
                          <p>Actor user: {record.actor_user_id || "—"}</p>
                          <p>Entity ID: {record.entity_id || "—"}</p>
                          {restaurantSlug ? <p>Restaurant: {restaurantSlug}</p> : null}
                          {onboardingIp ? <p>IP: {onboardingIp}</p> : null}
                          {businessStatus ? <p>Business status: {businessStatus}</p> : null}
                          {onboardingStatus ? (
                            <p>Onboarding status: {onboardingStatus}</p>
                          ) : null}
                        </div>
                      </div>

                      {record.metadata ? (
                        <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                            Metadata
                          </p>
                          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs text-neutral-600">
                            {JSON.stringify(record.metadata, null, 2)}
                          </pre>
                        </div>
                      ) : null}
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
