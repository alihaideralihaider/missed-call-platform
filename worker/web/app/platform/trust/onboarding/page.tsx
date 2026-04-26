"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ReviewStatus =
  | "pending_owner_activation"
  | "pending_phone_verification"
  | "active"
  | "closed_by_platform"
  | "rejected_fraud"
  | string;

type OnboardingRecord = {
  id: string;
  name: string;
  slug: string;
  contact_email: string | null;
  contact_phone: string | null;
  onboarding_status: ReviewStatus;
  is_active: boolean | null;
  business_status: string | null;
  onboarding_source_ip: string | null;
  onboarding_user_agent: string | null;
  created_at: string | null;
  repeated_ip_count: number;
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

  if (normalized === "pending_owner_activation") {
    return "bg-yellow-100 text-yellow-800";
  }

  if (normalized === "pending_phone_verification") {
    return "bg-blue-100 text-blue-800";
  }

  if (normalized === "closed_by_platform") {
    return "bg-neutral-200 text-neutral-800";
  }

  if (normalized === "rejected_fraud") {
    return "bg-red-100 text-red-800";
  }

  if (normalized === "active") {
    return "bg-green-100 text-green-800";
  }

  return "bg-neutral-100 text-neutral-700";
}

export default function PlatformOnboardingReviewPage() {
  const [records, setRecords] = useState<OnboardingRecord[]>([]);
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

      const response = await fetch(`/api/platform/trust/onboarding?${params}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Failed to load onboarding review queue.");
        setLoading(false);
        return;
      }

      setRecords(Array.isArray(data?.records) ? data.records : []);
      setPagination(data?.pagination || null);
      setLoading(false);
    } catch {
      setError("Something went wrong while loading onboarding review queue.");
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords(page, debouncedQuery);
  }, [page, debouncedQuery]);

  const pendingCount = useMemo(
    () =>
      records.filter((record) =>
        ["pending_owner_activation", "pending_phone_verification"].includes(
          String(record.onboarding_status || "").toLowerCase()
        )
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
        `/api/platform/trust/onboarding/${restaurantId}`,
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
        setActionError(data?.error || "Failed to update onboarding.");
        setUpdatingId("");
        return;
      }

      setActionMessage(data?.message || "Onboarding updated.");
      setUpdatingId("");
      await loadRecords(page, debouncedQuery);
    } catch {
      setActionError("Something went wrong while updating onboarding.");
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
              Onboarding Review
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Review suspicious, incomplete, or manually closed restaurant onboardings.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadRecords(page, debouncedQuery)}
            disabled={loading}
            className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh queue"}
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
            <p className="text-sm text-neutral-500">Review queue</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {loading ? "—" : records.length}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">Pending review</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {loading ? "—" : pendingCount}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">Repeated IPs</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {loading
                ? "—"
                : records.filter((record) => record.repeated_ip_count > 1).length}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by restaurant, slug, email, phone, status, or IP"
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
          />
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-sm text-neutral-500">Loading onboarding queue...</p>
          ) : error ? (
            <div>
              <h2 className="text-lg font-bold text-red-700">Error</h2>
              <p className="mt-2 text-sm text-neutral-600">{error}</p>
            </div>
          ) : records.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No onboarding records match this search.
            </p>
          ) : (
            <div className="space-y-4">
              {records.map((record) => {
                const normalizedStatus = String(record.onboarding_status || "")
                  .trim()
                  .toLowerCase();
                const isUpdating = updatingId === record.id;
                const canReactivate =
                  normalizedStatus === "closed_by_platform" ||
                  normalizedStatus === "rejected_fraud";

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
                              record.onboarding_status
                            )}`}
                          >
                            {record.onboarding_status}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1 text-sm text-neutral-600">
                          <p>Slug: {record.slug}</p>
                          <p>Email: {record.contact_email || "—"}</p>
                          <p>Phone: {record.contact_phone || "—"}</p>
                          <p>Created: {formatDateTime(record.created_at)}</p>
                          <p>Business status: {record.business_status || "—"}</p>
                          <p>Onboarding IP: {record.onboarding_source_ip || "—"}</p>
                          <p>Repeated IP count: {record.repeated_ip_count}</p>
                        </div>
                      </div>

                      <div className="w-full max-w-xs space-y-2">
                        <Link
                          href={`/platform/trust/restaurants/${record.id}`}
                          className="flex w-full items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-900"
                        >
                          View details
                        </Link>

                        <button
                          type="button"
                          onClick={() => runAction(record.id, "close")}
                          disabled={isUpdating}
                          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 disabled:opacity-60"
                        >
                          Close onboarding
                        </button>

                        <button
                          type="button"
                          onClick={() => runAction(record.id, "reject_fraud")}
                          disabled={isUpdating}
                          className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 disabled:opacity-60"
                        >
                          Reject as fraud
                        </button>

                        <button
                          type="button"
                          onClick={() => runAction(record.id, "block_ip")}
                          disabled={isUpdating || !record.onboarding_source_ip}
                          className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-700 disabled:opacity-60"
                        >
                          Block onboarding IP
                        </button>

                        {canReactivate ? (
                          <button
                            type="button"
                            onClick={() => runAction(record.id, "reactivate")}
                            disabled={isUpdating}
                            className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            Reactivate onboarding
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {record.onboarding_user_agent ? (
                      <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          User agent
                        </p>
                        <p className="mt-2 break-all text-xs text-neutral-600">
                          {record.onboarding_user_agent}
                        </p>
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
