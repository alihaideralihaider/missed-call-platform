"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CartItem,
  clearCart,
  getCartItems,
  getCartRestaurantSlug,
  subscribeToCartUpdates,
} from "@/lib/cart";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const SALES_TAX_RATE = 0.08875; // change this if needed

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

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export default function CheckoutPage({ params }: PageProps) {
  const [slug, setSlug] = useState("");
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartRestaurantSlug, setCartRestaurantSlug] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupTime, setPickupTime] = useState("ASAP");
  const [notes, setNotes] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function refresh() {
    setItems(getCartItems());
    setCartRestaurantSlug(getCartRestaurantSlug());
  }

  useEffect(() => {
    params.then((resolved) => {
      setSlug(cleanSlug(resolved?.slug));
    });

    refresh();

    const unsubscribe = subscribeToCartUpdates(() => {
      refresh();
    });

    return unsubscribe;
  }, [params]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const tax = useMemo(() => subtotal * SALES_TAX_RATE, [subtotal]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const restaurantName = formatRestaurantName(slug);

  const cartBelongsToThisRestaurant =
    !cartRestaurantSlug || !slug || cartRestaurantSlug === slug;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (submitting) return;
    setError("");

    const normalizedPhone = normalizePhone(customerPhone);

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (!slug) {
      setError("Missing restaurant slug.");
      return;
    }

    if (!customerName.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (normalizedPhone.length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        restaurantSlug: slug,
        customerName: customerName.trim(),
        customerPhone: normalizedPhone,
        pickupTime: pickupTime.trim() || "ASAP",
        notes: notes.trim(),
        smsOptIn,
        items: items.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let data: any = null;

      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        setError(data?.error || "Failed to place order.");
        setSubmitting(false);
        return;
      }

      clearCart();

      const orderId =
        typeof data?.orderId === "string" ? data.orderId : "";

      const orderNumber =
        typeof data?.orderNumber === "string"
          ? data.orderNumber
          : typeof data?.order?.order_number === "string"
          ? data.order.order_number
          : typeof data?.order?.public_order_code === "string"
          ? data.order.public_order_code
          : "";

      const params = new URLSearchParams();

      if (orderId) {
        params.set("orderId", orderId);
      }

      if (orderNumber) {
        params.set("orderNumber", orderNumber);
      }

      window.location.href = params.toString()
        ? `/r/${slug}/success?${params.toString()}`
        : `/r/${slug}/success`;
    } catch {
      setError("Something went wrong while placing your order.");
      setSubmitting(false);
    }
  }

  if (!cartBelongsToThisRestaurant) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <div className="mx-auto min-h-screen max-w-md bg-white px-4 py-6 shadow-sm">
          <div className="mb-6">
            <Link
              href={`/r/${slug}`}
              className="text-sm font-medium text-neutral-500"
            >
              ← Back to menu
            </Link>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h1 className="text-xl font-bold text-neutral-900">Wrong cart</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Your cart belongs to a different restaurant. Start a new order for{" "}
              {restaurantName}.
            </p>

            <div className="mt-5">
              <Link
                href={`/r/${slug}`}
                className="block w-full rounded-2xl bg-neutral-900 px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Go to menu
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <div className="mx-auto min-h-screen max-w-md bg-white px-4 py-6 shadow-sm">
          <div className="mb-6">
            <Link
              href={`/r/${slug}/cart`}
              className="text-sm font-medium text-neutral-500"
            >
              ← Back to cart
            </Link>
          </div>

          <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
            <h1 className="text-xl font-bold text-neutral-900">
              Your cart is empty
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Add items before checkout.
            </p>

            <Link
              href={`/r/${slug}`}
              className="mt-5 inline-block rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white"
            >
              Browse menu
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto min-h-screen max-w-md bg-white shadow-sm">
        <div className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 px-4 pb-4 pt-4 backdrop-blur">
          <Link
            href={`/r/${slug}/cart`}
            className="text-sm font-medium text-neutral-500"
          >
            ← Back to cart
          </Link>

          <div className="mt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Pickup checkout
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
              Checkout
            </h1>
            <p className="mt-1 text-sm text-neutral-500">{restaurantName}</p>
          </div>
        </div>

        <form
          id="checkout-form"
          onSubmit={handleSubmit}
          className="px-4 pb-36 pt-4"
        >
          <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">
              Contact details
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="customerName"
                  className="mb-2 block text-sm font-medium text-neutral-700"
                >
                  Name
                </label>
                <input
                  id="customerName"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                  autoComplete="name"
                />
              </div>

              <div>
                <label
                  htmlFor="customerPhone"
                  className="mb-2 block text-sm font-medium text-neutral-700"
                >
                  Phone
                </label>
                <input
                  id="customerPhone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                  className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                  autoComplete="tel"
                  inputMode="tel"
                />
              </div>

              <div>
                <label
                  htmlFor="pickupTime"
                  className="mb-2 block text-sm font-medium text-neutral-700"
                >
                  Pickup time
                </label>
                <select
                  id="pickupTime"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-400"
                >
                  <option value="ASAP">ASAP</option>
                  <option value="15 minutes">15 minutes</option>
                  <option value="30 minutes">30 minutes</option>
                  <option value="45 minutes">45 minutes</option>
                  <option value="60 minutes">60 minutes</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="mb-2 block text-sm font-medium text-neutral-700"
                >
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Extra sauce, no onions, call on arrival, etc."
                  className="min-h-[100px] w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                />
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={smsOptIn}
                  onChange={(e) => setSmsOptIn(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-neutral-300"
                />
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    Text me order updates and occasional offers
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    You can opt out later.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
            <h2 className="text-base font-semibold text-neutral-900">
              Order summary
            </h2>

            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div
                  key={item.name}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900">
                      {item.quantity} × {item.name}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      ${item.price.toFixed(2)} each
                    </p>
                  </div>

                  <p className="text-sm font-semibold text-neutral-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-neutral-200 pt-4 text-sm">
              <div className="flex items-center justify-between text-neutral-600">
                <span>
                  Subtotal ({itemCount} item{itemCount > 1 ? "s" : ""})
                </span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              <div className="mt-2 flex items-center justify-between text-neutral-600">
                <span>Sales tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>

              <div className="mt-3 flex items-center justify-between text-base font-bold text-neutral-900">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </form>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 p-3 backdrop-blur">
          <div className="mx-auto w-full max-w-md">
            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="flex w-full items-center justify-between rounded-2xl bg-neutral-900 px-4 py-4 text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
            >
              <span className="text-sm font-semibold">
                {submitting ? "Placing order..." : "Place order"}
              </span>
              <span className="text-sm font-semibold">
                ${total.toFixed(2)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}