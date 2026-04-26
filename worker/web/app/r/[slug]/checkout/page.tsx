"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  CartItem,
  clearCart,
  getCartItems,
  getCartRestaurantSlug,
  subscribeToCartUpdates,
} from "@/lib/cart";
import {
  evaluateRestaurantHours,
  type PickupOption,
  type RestaurantHourRow,
} from "@/lib/restaurant-hours";

type PageProps = {
  params: Promise<{ slug: string }>;
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

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeTaxRate(value: unknown): number {
  const raw = Number(value);

  if (!Number.isFinite(raw) || raw <= 0) {
    return 0;
  }

  return raw >= 1 ? raw / 100 : raw;
}

export default function CheckoutPage({ params }: PageProps) {
  const [slug, setSlug] = useState("");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartRestaurantSlug, setCartRestaurantSlug] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupTime, setPickupTime] = useState("ASAP");
  const [pickupMode, setPickupMode] = useState<"asap" | "scheduled">("asap");
  const [notes, setNotes] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [smsConsentTouched, setSmsConsentTouched] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [restaurantTimezone, setRestaurantTimezone] = useState("America/New_York");
  const [restaurantHours, setRestaurantHours] = useState<RestaurantHourRow[]>([]);
  const [salesTaxRate, setSalesTaxRate] = useState(0);
  const [taxMode, setTaxMode] = useState<"exclusive" | "none">("none");
  const [loadingPickupOptions, setLoadingPickupOptions] = useState(false);

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

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    async function loadRestaurantPickupData() {
      setLoadingPickupOptions(true);

      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: restaurantData, error: restaurantError } = await supabase
          .schema("food_ordering")
          .from("restaurants")
          .select("id, timezone")
          .eq("slug", slug)
          .maybeSingle();

        if (restaurantError || !restaurantData?.id) {
          if (!cancelled) {
            setRestaurantId(null);
            setRestaurantHours([]);
            setLoadingPickupOptions(false);
          }
          return;
        }

        const timezone =
          String(restaurantData.timezone || "").trim() || "America/New_York";

        const { data: taxSettingsData } = await supabase
          .schema("food_ordering")
          .from("tax_settings")
          .select("sales_tax_rate, tax_mode")
          .eq("restaurant_id", restaurantData.id)
          .maybeSingle();

        const { data: hoursData, error: hoursError } = await supabase
          .schema("food_ordering")
          .from("restaurant_hours")
          .select("day_of_week, open_time, close_time, is_closed")
          .eq("restaurant_id", restaurantData.id);

        if (!cancelled) {
          setRestaurantId(restaurantData.id);
          setRestaurantTimezone(timezone);
          setSalesTaxRate(normalizeTaxRate(taxSettingsData?.sales_tax_rate));
          setTaxMode(
            String(taxSettingsData?.tax_mode || "").trim().toLowerCase() === "exclusive"
              ? "exclusive"
              : "none"
          );
          setNow(new Date());
          setRestaurantHours(
            hoursError ? [] : ((hoursData as RestaurantHourRow[] | null) || [])
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingPickupOptions(false);
        }
      }
    }

    loadRestaurantPickupData();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (smsConsentTouched) return;

    const normalizedPhone = normalizePhone(customerPhone);

    if (!restaurantId || !slug || normalizedPhone.length < 10) {
      setSmsOptIn(false);
      return;
    }

    let cancelled = false;

    async function loadSmsConsentStatus() {
      try {
        const response = await fetch("/api/consent/sms-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurantSlug: slug,
            phoneNumber: normalizedPhone,
          }),
        });

        const data = await response.json().catch(() => null);

        if (!cancelled) {
          setSmsOptIn(Boolean(data?.defaultSmsOptIn));
        }
      } catch {
        if (!cancelled) {
          setSmsOptIn(false);
        }
      }
    }

    loadSmsConsentStatus();

    return () => {
      cancelled = true;
    };
  }, [customerPhone, restaurantId, slug, smsConsentTouched]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const tax = useMemo(
    () => (taxMode === "exclusive" ? subtotal * salesTaxRate : 0),
    [salesTaxRate, subtotal, taxMode]
  );
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const restaurantName = formatRestaurantName(slug);

  const cartBelongsToThisRestaurant =
    !cartRestaurantSlug || !slug || cartRestaurantSlug === slug;

  useEffect(() => {
    if (!cartBelongsToThisRestaurant && cartRestaurantSlug) {
      clearCart();
    }
  }, [cartBelongsToThisRestaurant, cartRestaurantSlug]);

  const pickupEvaluation = useMemo(
    () => evaluateRestaurantHours(restaurantHours, restaurantTimezone, now),
    [restaurantHours, restaurantTimezone, now]
  );

  const pickupOptions = pickupEvaluation.pickupOptions;
  const scheduledPickupOptions = pickupEvaluation.availableScheduledSlots;

  const selectedPickupOption = useMemo<PickupOption | null>(() => {
    if (pickupMode === "asap") {
      return pickupOptions.find((option) => option.value === "ASAP") || null;
    }

    return (
      scheduledPickupOptions.find((option) => option.value === pickupTime) || null
    );
  }, [pickupMode, pickupOptions, pickupTime, scheduledPickupOptions]);

  const selectedPickupLabel = selectedPickupOption?.label || "";
  const selectedPickupAt = selectedPickupOption?.pickupAt || "";

  useEffect(() => {
    if (!pickupOptions.length) {
      setPickupMode("scheduled");
      setPickupTime("");
      return;
    }

    const hasAsap = pickupOptions.some((option) => option.value === "ASAP");

    if (pickupMode === "asap") {
      if (hasAsap) {
        if (pickupTime !== "ASAP") {
          setPickupTime("ASAP");
        }
        return;
      }

      if (scheduledPickupOptions.length > 0) {
        setPickupMode("scheduled");
        setPickupTime(scheduledPickupOptions[0].value);
      }

      return;
    }

    if (pickupMode === "scheduled") {
      if (scheduledPickupOptions.length === 0) {
        if (hasAsap) {
          setPickupMode("asap");
          setPickupTime("ASAP");
        } else {
          setPickupTime("");
        }
        return;
      }

      const stillValid = scheduledPickupOptions.some(
        (option) => option.value === pickupTime
      );

      if (!stillValid) {
        setPickupTime(scheduledPickupOptions[0].value);
      }
    }
  }, [pickupMode, pickupOptions, pickupTime, scheduledPickupOptions]);

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

    if (pickupMode === "asap" && !pickupEvaluation.allowsAsap) {
      setError(
        pickupEvaluation.nextOpenText ||
          "ASAP pickup is not currently available."
      );
      return;
    }

    if (pickupMode === "scheduled" && !scheduledPickupOptions.length) {
      setError("No scheduled pickup times are currently available.");
      return;
    }

    if (!selectedPickupAt) {
      setError("No pickup times are currently available.");
      return;
    }

    setSubmitting(true);

    try {
      const pickupDisplayText =
        selectedPickupLabel || (pickupMode === "asap" ? "ASAP" : "Scheduled");

      const payload = {
        restaurantSlug: slug,
        customerName: customerName.trim(),
        customerPhone: normalizedPhone,
        pickupTime:
          pickupMode === "asap" ? "ASAP" : pickupDisplayText,
        pickupTimeLabel: pickupDisplayText,
        pickupAt: selectedPickupAt,
        notes: notes.trim(),
        smsOptIn,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
        })),
      };

      console.log("CHECKOUT_PAYLOAD_ITEMS", payload.items);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let data: { error?: string; orderId?: string; orderNumber?: string; order?: { order_number?: string; public_order_code?: string } } | null =
        null;

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

      if (selectedPickupLabel) {
        params.set("pickupLabel", selectedPickupLabel);
      }

      if (selectedPickupAt) {
        params.set("pickupAt", selectedPickupAt);
      }

      params.set("smsOptIn", smsOptIn ? "1" : "0");

      window.location.href = params.toString()
        ? `/r/${slug}/success?${params.toString()}`
        : `/r/${slug}/success`;
    } catch {
      setError("Something went wrong while placing your order.");
      setSubmitting(false);
    }
  }

  if (!cartBelongsToThisRestaurant || items.length === 0) {
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

          <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
            <h1 className="text-xl font-bold text-neutral-900">
              Your cart is empty
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Add items from the menu to continue to checkout.
            </p>

            <Link
              href={`/r/${slug}`}
              className="mt-5 inline-block rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white"
            >
              Go to menu
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
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  Pickup time
                </label>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (pickupEvaluation.allowsAsap) {
                        setPickupMode("asap");
                        setPickupTime("ASAP");
                      }
                    }}
                    disabled={loadingPickupOptions || !pickupEvaluation.allowsAsap}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      pickupMode === "asap"
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white text-neutral-900"
                    }`}
                  >
                    <p className="text-sm font-semibold">ASAP</p>
                    <p
                      className={`mt-1 text-xs ${
                        pickupMode === "asap"
                          ? "text-neutral-200"
                          : "text-neutral-500"
                      }`}
                    >
                      {pickupOptions.find((option) => option.value === "ASAP")?.label ||
                        pickupEvaluation.nextOpenText ||
                        "ASAP is not currently available"}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (scheduledPickupOptions.length > 0) {
                        setPickupMode("scheduled");
                        if (
                          !scheduledPickupOptions.some(
                            (option) => option.value === pickupTime
                          )
                        ) {
                          setPickupTime(scheduledPickupOptions[0].value);
                        }
                      }
                    }}
                    disabled={
                      loadingPickupOptions || scheduledPickupOptions.length === 0
                    }
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      pickupMode === "scheduled"
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white text-neutral-900"
                    }`}
                  >
                    <p className="text-sm font-semibold">Schedule for later</p>
                    <p
                      className={`mt-1 text-xs ${
                        pickupMode === "scheduled"
                          ? "text-neutral-200"
                          : "text-neutral-500"
                      }`}
                    >
                      {scheduledPickupOptions.length > 0
                        ? "Choose an available pickup slot"
                        : pickupEvaluation.nextOpenText ||
                          "No scheduled pickup times available"}
                    </p>
                  </button>
                </div>

                {pickupMode === "scheduled" ? (
                  <div className="mt-3">
                    <select
                      id="pickupTime"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      disabled={
                        loadingPickupOptions || scheduledPickupOptions.length === 0
                      }
                      className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-100"
                    >
                      {scheduledPickupOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {selectedPickupLabel ? (
                  <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Selected pickup
                    </p>
                    <p className="mt-1 text-sm font-semibold text-neutral-900">
                      {selectedPickupLabel}
                    </p>
                  </div>
                ) : null}

                {loadingPickupOptions ? (
                  <p className="mt-2 text-xs text-neutral-500">
                    Loading available pickup times...
                  </p>
                ) : null}

                {!loadingPickupOptions && pickupEvaluation.statusText ? (
                  <p
                    className={`mt-2 text-xs ${
                      pickupEvaluation.isOpenNow ? "text-neutral-500" : "text-red-600"
                    }`}
                  >
                    {pickupEvaluation.statusText}
                  </p>
                ) : null}

                {!loadingPickupOptions && pickupOptions.length === 0 ? (
                  <p className="mt-2 text-xs text-red-600">
                    No pickup times are currently available.
                  </p>
                ) : null}
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
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
            <h2 className="text-base font-semibold text-neutral-900">
              Order summary
            </h2>

            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div
                  key={`${item.id}-${item.name}`}
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

          <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
            <label className="flex items-start gap-3 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={smsOptIn}
                onChange={(e) => {
                  setSmsConsentTouched(true);
                  setSmsOptIn(e.target.checked);
                }}
                className="mt-1"
              />
              <span className="leading-5">
                I agree to receive SMS updates about my order from{" "}
                {restaurantName || "the restaurant"}. Message frequency varies.
                Msg &amp; data rates may apply. Reply STOP to opt out, HELP for
                help. Consent is not a condition of purchase.
              </span>
            </label>
          </div>
        </form>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 p-3 backdrop-blur">
          <div className="mx-auto w-full max-w-md">
            <button
              type="submit"
              form="checkout-form"
              disabled={submitting || loadingPickupOptions || pickupOptions.length === 0}
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
