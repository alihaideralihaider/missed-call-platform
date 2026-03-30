"use client";

import { useEffect, useState } from "react";
import { clearCart } from "@/lib/cart";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

type OrderResponse = {
  id: string;
  order_number: number | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  pickup_time: string | null;
  notes: string | null;
};

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
        const apiBase = process.env.NEXT_PUBLIC_API_BASE;
        const response = await fetch(`${apiBase}/api/orders/${orderId}`);
        const data = await response.json();

        console.log("confirmation order response:", data);

        if (response.ok) {
          setOrder(data.order);
        }
      } catch (error) {
        console.error("Failed to load confirmation order:", error);
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-white px-6 text-center">
        <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
          Order Placed
        </div>

        <h1 className="mt-4 text-3xl font-bold">Thank you</h1>

        <p className="mt-2 text-sm text-gray-600">
          Your pickup order has been received.
        </p>

        <div className="mt-6 w-full rounded-2xl border p-4 text-left">
          <p className="text-sm text-gray-500">Order Number</p>
          <p className="font-semibold">
            {loading
              ? "Loading..."
              : order?.order_number != null
              ? `#${String(order.order_number).padStart(5, "0")}`
              : "Unavailable"}
          </p>

          <p className="mt-4 text-sm text-gray-500">Estimated Pickup</p>
          <p className="font-semibold">
            {loading ? "Loading..." : order?.pickup_time || "ASAP"}
          </p>

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