"use client";

import { useEffect, useMemo, useState } from "react";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type Restaurant = {
  id: string;
  name: string;
  slug: string;
};

type OrderItem = {
  id: string;
  menu_item_id?: string | null;
  item_name: string;
  price: number;
  unit_price: number;
  line_total: number;
  quantity: number;
  created_at?: string | null;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  pickup_time: string;
  notes: string;
  payment_status: string;
  payment_method: string;
  created_at?: string | null;
  customer: {
    id: string;
    name: string | null;
    phone: string | null;
  } | null;
  items: OrderItem[];
};

function cleanSlug(value: unknown): string {
  const s = String(value ?? "").trim().toLowerCase();
  return s && s !== "undefined" && s !== "null" ? s : "";
}

function toCurrency(value: number): string {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatPhone(value?: string | null): string {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return value || "—";
}

function statusPillClass(status: string): string {
  const normalized = status.trim().toLowerCase();

  if (normalized === "pending") {
    return "bg-yellow-100 text-yellow-800";
  }

  if (normalized === "confirmed") {
    return "bg-blue-100 text-blue-800";
  }

  if (normalized === "ready") {
    return "bg-green-100 text-green-800";
  }

  if (normalized === "completed") {
    return "bg-neutral-200 text-neutral-800";
  }

  if (normalized === "cancelled") {
    return "bg-red-100 text-red-800";
  }

  return "bg-neutral-100 text-neutral-700";
}

function getNextPrimaryStatus(status: string): string | null {
  const normalized = status.trim().toLowerCase();

  if (normalized === "pending") return "confirmed";
  if (normalized === "confirmed") return "ready";
  if (normalized === "ready") return "completed";

  return null;
}

function getPrimaryActionLabel(status: string): string | null {
  const next = getNextPrimaryStatus(status);

  if (next === "confirmed") return "Confirm Order";
  if (next === "ready") return "Mark Ready";
  if (next === "completed") return "Complete Order";

  return null;
}

function canCancel(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === "pending" ||
    normalized === "confirmed" ||
    normalized === "ready"
  );
}

export default function RestaurantOrdersAdminPage({ params }: PageProps) {
  const [slug, setSlug] = useState("");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState("");

  async function loadPage(nextSlugFromState?: string, isRefresh = false) {
    const targetSlug = nextSlugFromState || slug;

    if (!targetSlug) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setLoadingError("");

    try {
      const res = await fetch(`/api/admin/restaurants/${targetSlug}/orders`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        setLoadingError(data?.error || "Failed to load restaurant orders.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setRestaurant(data.restaurant || null);
      setOrders(data.orders || []);
      setLoading(false);
      setRefreshing(false);
    } catch {
      setLoadingError("Something went wrong while loading orders.");
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    async function init() {
      const resolved = await params;
      const nextSlug = cleanSlug(resolved?.slug);
      setSlug(nextSlug);
      await loadPage(nextSlug);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const orderCount = orders.length;
  const totalSales = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [orders]
  );

  const pendingCount = useMemo(
    () =>
      orders.filter(
        (order) => order.status.trim().toLowerCase() === "pending"
      ).length,
    [orders]
  );

  async function updateOrderStatus(orderId: string, nextStatus: string) {
    if (!slug || updatingOrderId) return;

    setActionError("");
    setActionMessage("");
    setUpdatingOrderId(orderId);

    try {
      const res = await fetch(
        `/api/admin/restaurants/${slug}/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setActionError(data?.error || "Failed to update order status.");
        setUpdatingOrderId("");
        return;
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: nextStatus } : order
        )
      );

      setActionMessage(data?.message || `Order moved to ${nextStatus}.`);
      setUpdatingOrderId("");
    } catch {
      setActionError("Something went wrong while updating order status.");
      setUpdatingOrderId("");
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Restaurant orders admin
            </p>
            <h1 className="mt-1 text-2xl font-bold text-neutral-900">
              {loading ? "Loading..." : restaurant?.name || "Orders"}
            </h1>
            {!loading && restaurant?.slug ? (
              <p className="mt-1 text-sm text-neutral-500">
                Slug: {restaurant.slug}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => loadPage(slug, true)}
            disabled={loading || refreshing}
            className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh orders"}
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
            <p className="text-sm text-neutral-500">Total orders</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {loading ? "—" : orderCount}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">Pending orders</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {loading ? "—" : pendingCount}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">Total sales</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {loading ? "—" : toCurrency(totalSales)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-sm text-neutral-500">Loading orders...</p>
          ) : loadingError ? (
            <div>
              <h2 className="text-lg font-bold text-red-700">Error</h2>
              <p className="mt-2 text-sm text-neutral-600">{loadingError}</p>
            </div>
          ) : orders.length === 0 ? (
            <div>
              <h2 className="text-lg font-bold text-neutral-900">No orders yet</h2>
              <p className="mt-2 text-sm text-neutral-500">
                When customers place orders, they will show here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const primaryNextStatus = getNextPrimaryStatus(order.status);
                const primaryActionLabel = getPrimaryActionLabel(order.status);
                const isUpdatingThisOrder = updatingOrderId === order.id;

                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold text-neutral-900">
                            {order.order_number}
                          </h2>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusPillClass(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-neutral-500">
                          Placed: {formatDateTime(order.created_at)}
                        </p>
                        <p className="mt-1 text-sm text-neutral-500">
                          Pickup time: {order.pickup_time || "ASAP"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-neutral-500">Total</p>
                        <p className="text-xl font-bold text-neutral-900">
                          {toCurrency(order.total)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {primaryNextStatus && primaryActionLabel ? (
                        <button
                          type="button"
                          disabled={isUpdatingThisOrder}
                          onClick={() =>
                            updateOrderStatus(order.id, primaryNextStatus)
                          }
                          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {isUpdatingThisOrder
                            ? "Saving..."
                            : primaryActionLabel}
                        </button>
                      ) : null}

                      {canCancel(order.status) ? (
                        <button
                          type="button"
                          disabled={isUpdatingThisOrder}
                          onClick={() =>
                            updateOrderStatus(order.id, "cancelled")
                          }
                          className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {isUpdatingThisOrder ? "Saving..." : "Cancel Order"}
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-5 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
                      <div className="rounded-xl border border-neutral-200 bg-white p-4">
                        <h3 className="text-sm font-semibold text-neutral-900">
                          Customer
                        </h3>

                        <div className="mt-3 space-y-2 text-sm text-neutral-700">
                          <p>
                            <span className="font-medium text-neutral-900">Name:</span>{" "}
                            {order.customer?.name || "—"}
                          </p>
                          <p>
                            <span className="font-medium text-neutral-900">Phone:</span>{" "}
                            {formatPhone(order.customer?.phone)}
                          </p>
                          <p>
                            <span className="font-medium text-neutral-900">
                              Payment:
                            </span>{" "}
                            {order.payment_method || "—"}
                          </p>
                          <p>
                            <span className="font-medium text-neutral-900">
                              Payment status:
                            </span>{" "}
                            {order.payment_status || "—"}
                          </p>
                        </div>

                        {order.notes ? (
                          <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                              Notes
                            </p>
                            <p className="mt-1 text-sm text-neutral-700">
                              {order.notes}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-xl border border-neutral-200 bg-white p-4">
                        <h3 className="text-sm font-semibold text-neutral-900">
                          Items
                        </h3>

                        <div className="mt-3 divide-y divide-neutral-100">
                          {order.items.length === 0 ? (
                            <p className="text-sm text-neutral-500">
                              No order items found.
                            </p>
                          ) : (
                            order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-start justify-between gap-3 py-3"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-neutral-900">
                                    {item.item_name}
                                  </p>
                                  <p className="mt-1 text-xs text-neutral-500">
                                    Qty {item.quantity}
                                  </p>
                                </div>

                                <div className="shrink-0 text-right">
                                  <p className="text-sm font-medium text-neutral-900">
                                    {toCurrency(item.unit_price)}
                                  </p>
                                  <p className="mt-1 text-xs text-neutral-500">
                                    Line total {toCurrency(item.line_total)}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="mt-4 border-t border-neutral-200 pt-4">
                          <div className="flex items-center justify-between text-sm text-neutral-600">
                            <span>Subtotal</span>
                            <span>{toCurrency(order.subtotal)}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-sm text-neutral-600">
                            <span>Tax</span>
                            <span>{toCurrency(order.tax)}</span>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-base font-bold text-neutral-900">
                            <span>Total</span>
                            <span>{toCurrency(order.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
