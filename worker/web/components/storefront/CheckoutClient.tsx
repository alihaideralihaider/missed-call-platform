"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@/lib/api";
import { getCart, clearCart } from "@/lib/cart";

type Props = {
  slug?: string;
};

function cleanSlug(value: unknown): string {
  const s = String(value ?? "").trim().toLowerCase();
  return s && s !== "undefined" && s !== "null" ? s : "";
}

export default function CheckoutClient({ slug }: Props) {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupTime, setPickupTime] = useState("ASAP");
  const [notes, setNotes] = useState("");
  const [smsPromotionsOptIn, setSmsPromotionsOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const { items, restaurantSlug } = getCart();

    const propSlug = cleanSlug(slug);
    const cartSlug = cleanSlug(restaurantSlug);
    const effectiveSlug = propSlug || cartSlug;

    if (!customerName || !customerPhone || items.length === 0) {
      setError("Please fill in your name, phone, and cart.");
      return;
    }

    if (!effectiveSlug) {
      setError(
        "Restaurant slug is missing. Please go back to the menu and try again."
      );
      return;
    }

    // 🔥 SOLD-OUT CHECK
    const soldOutItems = items.filter((item: any) => item.is_sold_out);

    if (soldOutItems.length > 0) {
      setError(
        `${soldOutItems[0].name} is currently sold out. Please remove it from your cart.`
      );
      return;
    }

    try {
      setSubmitting(true);

      const result = await createOrder({
        restaurantSlug: effectiveSlug,
        customerName,
        customerPhone,
        pickupTime,
        notes,
        items,
      });

      clearCart();

      router.push(
        `/r/${effectiveSlug}/confirmation?orderId=${result.orderId}`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to place order";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const backSlug = cleanSlug(slug) || cleanSlug(getCart().restaurantSlug);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto min-h-screen max-w-md bg-white">
        <header className="border-b px-4 py-4">
          <Link href={`/r/${backSlug}/cart`} className="text-sm text-gray-500">
            ← Back to cart
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Checkout</h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-2xl border px-4 py-3 outline-none"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full rounded-2xl border px-4 py-3 outline-none"
              placeholder="Your phone number"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Pickup time
            </label>
            <input
              type="text"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="w-full rounded-2xl border px-4 py-3 outline-none"
              placeholder="ASAP"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-2xl border px-4 py-3 outline-none"
              rows={4}
              placeholder="Optional notes"
            />
          </div>

          {/* 🔥 IMPROVED ERROR UX */}
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">{error}</p>

              <Link
                href={`/r/${backSlug}/cart`}
                className="mt-3 inline-block rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Go back to cart
              </Link>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="block w-full rounded-2xl bg-black px-4 py-3 text-center font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Placing Order..." : "Place Order"}
          </button>

          <div className="space-y-2">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={smsPromotionsOptIn}
                onChange={(e) => setSmsPromotionsOptIn(e.target.checked)}
                className="mt-1"
              />
              <span>Send me deals and promotions via SMS</span>
            </label>

            <p className="text-xs text-gray-500">
              By checking this box, you agree to receive marketing text messages.
              Message &amp; data rates may apply. Reply STOP to unsubscribe.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}