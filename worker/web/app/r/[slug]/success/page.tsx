"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type CustomerOrder = {
  id: string;
  status: string;
  total: number;
  sms_opt_in?: boolean | null;
  pickup_time: string | null;
  pickup_time_label?: string | null;
  pickup_at?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  order_number: string;
};

function cleanSlug(value: unknown): string {
  const s = String(value ?? "").trim().toLowerCase();
  return s && s !== "undefined" && s !== "null" ? s : "";
}

function formatRestaurantName(slug: string): string {
  if (!slug) return "Restaurant";

  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatFallbackOrderRef(orderId: string | null, slug: string): string | null {
  if (!orderId) return null;

  const clean = orderId.trim();
  if (!clean) return null;

  const suffix = clean.replace(/-/g, "").slice(-6).toUpperCase();
  const code = slug
    ? slug
        .split("-")
        .filter(Boolean)
        .slice(0, 3)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "ORD"
    : "ORD";

  return `${code}-${suffix}`;
}

function formatPickupDateTime(value?: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusPillClass(status: string): string {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "pending") return "bg-yellow-100 text-yellow-800";
  if (normalized === "confirmed") return "bg-blue-100 text-blue-800";
  if (normalized === "ready") return "bg-green-100 text-green-800";
  if (normalized === "completed") return "bg-neutral-200 text-neutral-800";
  if (normalized === "cancelled") return "bg-red-100 text-red-800";

  return "bg-neutral-100 text-neutral-700";
}

function shouldPollStatus(status: string | null | undefined): boolean {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized === "pending" || normalized === "confirmed" || normalized === "ready";
}

function getCancelledByLabel(value: string | null | undefined): string {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "restaurant") {
    return "The restaurant cancelled this order.";
  }

  if (normalized === "customer") {
    return "You cancelled this order.";
  }

  return "This order has been cancelled.";
}

export default function SuccessPage({ params }: PageProps) {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const orderNumber = searchParams.get("orderNumber");
  const pickupLabel = searchParams.get("pickupLabel");
  const pickupAt = searchParams.get("pickupAt");
  const smsOptInParam = searchParams.get("smsOptIn");
  const smsOptInFromQuery = smsOptInParam === "1";
  const [slug, setSlug] = useState("");
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(Boolean(orderId));
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelMessage, setCancelMessage] = useState("");

  useEffect(() => {
    params.then((resolved) => {
      setSlug(cleanSlug(resolved?.slug));
    });
  }, [params]);

  useEffect(() => {
    if (!orderId) {
      setLoadingOrder(false);
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;

    async function loadOrder() {
      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          cache: "no-store",
        });
        const data = await response.json().catch(() => null);

        if (!cancelled && response.ok && data?.order) {
          setOrder(data.order as CustomerOrder);

          if (intervalId !== null && !shouldPollStatus(data.order.status)) {
            window.clearInterval(intervalId);
            intervalId = null;
          }
        }
      } catch (error) {
        console.error("Failed to load order status:", error);
      } finally {
        if (!cancelled) {
          setLoadingOrder(false);
        }
      }
    }

    loadOrder();

    intervalId = window.setInterval(() => {
      loadOrder();
    }, 15000);

    function handleWindowFocus() {
      loadOrder();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadOrder();
      }
    }

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;

      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [orderId]);

  const restaurantName = formatRestaurantName(slug);

  const displayOrderRef = useMemo(() => {
    const liveOrderNumber = String(order?.order_number ?? "").trim();
    if (liveOrderNumber) {
      return liveOrderNumber;
    }

    const cleanOrderNumber = String(orderNumber ?? "").trim();
    if (cleanOrderNumber) {
      return cleanOrderNumber;
    }

    return formatFallbackOrderRef(orderId, slug);
  }, [order?.order_number, orderNumber, orderId, slug]);

  const formattedPickupAt = useMemo(
    () => formatPickupDateTime(order?.pickup_at || pickupAt),
    [order?.pickup_at, pickupAt]
  );

  const displayPickupText = useMemo(() => {
    const livePickupLabel = String(order?.pickup_time_label ?? "").trim();
    if (livePickupLabel) {
      return livePickupLabel;
    }

    const cleanPickupLabel = String(pickupLabel ?? "").trim();
    if (cleanPickupLabel) {
      return cleanPickupLabel;
    }

    if (formattedPickupAt) {
      return formattedPickupAt;
    }

    return "20–30 minutes";
  }, [order?.pickup_time_label, pickupLabel, formattedPickupAt]);

  const normalizedStatus = String(order?.status || "pending").trim().toLowerCase();
  const effectiveSmsOptIn =
    typeof order?.sms_opt_in === "boolean" ? order.sms_opt_in : smsOptInFromQuery;
  const smsUpdateMessage =
    effectiveSmsOptIn === true
      ? "You will receive SMS updates about your order."
      : effectiveSmsOptIn === false
      ? "You chose not to receive SMS updates for this order. You can opt in during checkout for future orders."
      : "You chose not to receive SMS updates for this order. You can opt in during checkout for future orders.";
  const canCancelOrder = Boolean(orderId) && normalizedStatus === "pending";
  const showContactRestaurantMessage =
    Boolean(orderId) &&
    normalizedStatus !== "pending" &&
    normalizedStatus !== "cancelled";
  const statusLabel = normalizedStatus
    ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)
    : "Pending";

  const statusMessage = useMemo(() => {
    if (normalizedStatus === "cancelled") {
      return getCancelledByLabel(order?.cancelled_by);
    }

    if (normalizedStatus === "completed") {
      return "This order has been completed.";
    }

    if (normalizedStatus === "ready") {
      return "Your order is ready for pickup.";
    }

    if (normalizedStatus === "confirmed") {
      return "The restaurant confirmed your order and is preparing it.";
    }

    return "Your order is active and waiting for the next update.";
  }, [normalizedStatus, order?.cancelled_by]);

  const pickupHelperText = useMemo(() => {
    if (normalizedStatus === "cancelled") {
      return "Please contact the restaurant directly if you need a replacement or refund update.";
    }

    if (String(pickupLabel ?? "").trim() || formattedPickupAt) {
      return "Please head to the restaurant at your selected pickup time.";
    }

    return "Please head to the restaurant at your selected pickup time.";
  }, [normalizedStatus, pickupLabel, formattedPickupAt]);

  async function handleCancelOrder() {
    if (!orderId || !slug || cancelSubmitting || !canCancelOrder) {
      return;
    }

    const confirmed = window.confirm(
      "Cancel this order? You can only cancel while it is still pending."
    );

    if (!confirmed) {
      return;
    }

    setCancelError("");
    setCancelMessage("");
    setCancelSubmitting(true);

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "cancel",
          restaurantSlug: slug,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setCancelError(
          data?.error || "Failed to cancel order. Please refresh and try again."
        );
        setCancelSubmitting(false);
        return;
      }

      if (data?.order) {
        setOrder(data.order as CustomerOrder);
      }

      setCancelMessage(data?.message || "Your order has been cancelled.");
      setCancelSubmitting(false);
    } catch {
      setCancelError("Failed to cancel order. Please refresh and try again.");
      setCancelSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto flex min-h-screen max-w-md items-center bg-white px-4 py-6 shadow-sm">
        <div className="w-full rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
              normalizedStatus === "cancelled"
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {normalizedStatus === "cancelled" ? "!" : "✓"}
          </div>

          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-neutral-500">
            {normalizedStatus === "cancelled" ? "Order cancelled" : "Pickup order placed"}
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">
            {normalizedStatus === "cancelled" ? "Order cancelled" : "Thank you"}
          </h1>

          <p className="mt-2 text-sm text-neutral-600">
            {normalizedStatus === "cancelled"
              ? `This order is no longer active at ${restaurantName}.`
              : `Your order has been sent to ${restaurantName}.`}
          </p>

          {orderId ? (
            <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Order status
              </p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusPillClass(
                    normalizedStatus
                  )}`}
                >
                  {loadingOrder && !order ? "Loading..." : statusLabel}
                </span>
              </div>
              <p className="mt-2 text-sm text-neutral-600">{statusMessage}</p>
            </div>
          ) : null}

          {cancelError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {cancelError}
            </div>
          ) : null}

          {cancelMessage ? (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {cancelMessage}
            </div>
          ) : null}

          {normalizedStatus !== "cancelled" ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                Estimated ready time
              </p>
              <p className="mt-1 text-lg font-bold text-amber-900">
                {displayPickupText}
              </p>
            </div>
          ) : null}

          <p className="mt-2 text-sm text-neutral-500">
            {pickupHelperText}
          </p>

          {showContactRestaurantMessage ? (
            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
              This order can no longer be cancelled online. Please contact the restaurant directly if you need help.
            </div>
          ) : null}

          {displayOrderRef ? (
            <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Order number
              </p>
              <p className="mt-1 text-lg font-bold tracking-wide text-neutral-900">
                {displayOrderRef}
              </p>
            </div>
          ) : null}

          {orderId ? (
            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-left">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                SMS updates
              </p>
              <p className="mt-1 text-sm text-neutral-700">
                {loadingOrder && !order ? "Loading..." : smsUpdateMessage}
              </p>
            </div>
          ) : null}

          {canCancelOrder ? (
            <button
              type="button"
              onClick={handleCancelOrder}
              disabled={cancelSubmitting}
              className="mt-5 block w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 disabled:opacity-60"
            >
              {cancelSubmitting ? "Cancelling..." : "Cancel Order"}
            </button>
          ) : null}

          <div className="mt-6 space-y-3">
            <Link
              href={`/r/${slug}`}
              className="block w-full rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Back to menu
            </Link>

            <Link
              href={`/r/${slug}`}
              className="block w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-900"
            >
              Start another order
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
