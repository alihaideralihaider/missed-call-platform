"use client";

import { useEffect, useMemo, useState } from "react";
import PlatformPromoCard from "@/components/admin/PlatformPromoCard";
import { getPlatformPromotionsForPlacement } from "@/lib/platformPromotions";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type Restaurant = {
  id: string;
  name: string;
  slug: string;
};

type SalesRange = "daily" | "weekly" | "monthly";

type Metrics = {
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
};

function cleanSlug(value: unknown): string {
  const s = String(value ?? "").trim().toLowerCase();
  return s && s !== "undefined" && s !== "null" ? s : "";
}

function formatCurrency(value: number): string {
  return `$${Number(value || 0).toFixed(2)}`;
}

function rangeLabel(range: SalesRange): string {
  if (range === "daily") return "Today";
  if (range === "weekly") return "This Week";
  return "This Month";
}

export default function RestaurantSalesPage({ params }: PageProps) {
  const [slug, setSlug] = useState("");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [range, setRange] = useState<SalesRange>("daily");
  const [metrics, setMetrics] = useState<Metrics>({
    totalSales: 0,
    orderCount: 0,
    averageOrderValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const promotions = getPlatformPromotionsForPlacement("restaurant_admin_sales");

  useEffect(() => {
    params.then((resolved) => {
      setSlug(cleanSlug(resolved?.slug));
    });
  }, [params]);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    async function loadMetrics() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/admin/restaurants/${slug}/sales?range=${range}`,
          {
            cache: "no-store",
          }
        );
        const data = await response.json();

        if (!response.ok) {
          if (!cancelled) {
            setError(data?.error || "Failed to load sales metrics.");
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setRestaurant(data.restaurant || null);
          setMetrics(
            data.metrics || {
              totalSales: 0,
              orderCount: 0,
              averageOrderValue: 0,
            }
          );
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Something went wrong while loading sales metrics.");
          setLoading(false);
        }
      }
    }

    loadMetrics();

    return () => {
      cancelled = true;
    };
  }, [slug, range]);

  const subtitle = useMemo(() => rangeLabel(range), [range]);

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Sales Monitoring
            </p>
            <h1 className="mt-1 text-2xl font-bold text-neutral-900">
              {loading ? "Loading..." : restaurant?.name || "Sales"}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Completed orders only. {subtitle}.
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {(["daily", "weekly", "monthly"] as SalesRange[]).map((option) => {
              const active = range === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRange(option)}
                  className={
                    active
                      ? "shrink-0 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
                      : "shrink-0 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700"
                  }
                >
                  {option === "daily"
                    ? "Daily"
                    : option === "weekly"
                    ? "Weekly"
                    : "Monthly"}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">Total sales</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {loading ? "—" : formatCurrency(metrics.totalSales)}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">Completed orders</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {loading ? "—" : metrics.orderCount}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">Average order value</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {loading ? "—" : formatCurrency(metrics.averageOrderValue)}
            </p>
          </div>
        </div>

        {promotions.length > 0 ? (
          <div className="mt-6 space-y-3">
            {promotions.map((promo) => (
              <PlatformPromoCard key={promo.slug} promo={promo} />
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
