"use client";

import { useEffect, useState } from "react";
import { clearCart } from "@/lib/cart";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

type OrderResponse = {
  id: string;
  order_number: string | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  pickup_time: string | null;
  pickup_time_label: string | null;
  pickup_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  notes: string | null;
};

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
    return "This order was cancelled by the customer.";
  }

  return "This order has been cancelled.";
}

export default function ConfirmationPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    clearCart();
  }, []);

  useEffect(() => {
    async function loadOrder() {
      const orderId = searchParams.get("orderId");

      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          cache: "no-store",
        });
        const data = await response.json();

        if (response.ok) {
          setOrder(data.order);
        }
      } catch (error) {
        console.error("Failed to load confirmation order:", error);
      } finally {
        setLoading(false);
      }
    }

    const orderId = searchParams.get("orderId");

    loadOrder();

    if (!orderId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (shouldPollStatus(order?.status)) {
        loadOrder();
      }
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
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [searchParams, order?.status]);

  const normalizedStatus = String(order?.status || "pending").trim().toLowerCase();
  const statusLabel = normalizedStatus
    ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)
    : "Pending";
  const pickupDisplay =
    order?.pickup_time_label ||
    formatPickupDateTime(order?.pickup_at) ||
    order?.pickup_time ||
    "ASAP";
  const statusMessage =
    normalizedStatus === "cancelled"
      ? getCancelledByLabel(order?.cancelled_by)
      : normalizedStatus === "completed"
      ? "This order has been completed."
      : normalizedStatus === "ready"
      ? "Your order is ready for pickup."
      : normalizedStatus === "confirmed"
      ? "The restaurant confirmed your order and is preparing it."
      : "Your pickup order has been received.";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-white px-6 text-center">
        <div
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            normalizedStatus === "cancelled"
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {normalizedStatus === "cancelled" ? "Order Cancelled" : "Order Placed"}
        </div>

        <h1 className="mt-4 text-3xl font-bold">
          {normalizedStatus === "cancelled" ? "Order cancelled" : "Thank you"}
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          {statusMessage}
        </p>

        <div className="mt-4 flex items-center justify-center">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusPillClass(
              normalizedStatus
            )}`}
          >
            {loading ? "Loading..." : statusLabel}
          </span>
        </div>

        <div className="mt-6 w-full rounded-2xl border p-4 text-left">
          <p className="text-sm text-gray-500">Order Number</p>
          <p className="font-semibold">
            {loading
              ? "Loading..."
              : order?.order_number
              ? order.order_number
              : "Unavailable"}
          </p>

          {normalizedStatus !== "cancelled" ? (
            <>
              <p className="mt-4 text-sm text-gray-500">Estimated Pickup</p>
              <p className="font-semibold">
                {loading ? "Loading..." : pickupDisplay}
              </p>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm text-gray-500">Order Update</p>
              <p className="font-semibold text-red-700">
                {loading ? "Loading..." : statusMessage}
              </p>
            </>
          )}

          <p className="mt-4 text-sm text-gray-500">Total</p>
          <p className="font-semibold">
            {loading
              ? "Loading..."
              : order
              ? `$${Number(order.total).toFixed(2)}`
              : "Unavailable"}
          </p>
        </div>

        <Link
          href={`/r/${slug}`}
          className="mt-6 block w-full rounded-2xl bg-black px-4 py-3 text-center font-semibold text-white"
        >
          Back to Menu
        </Link>
      </div>
    </main>
  );
}
