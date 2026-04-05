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

type PageProps = {
  params: Promise<{ slug: string }>;
};

type RestaurantHourRow = {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean | null;
};

type PickupOption = {
  value: string;
  label: string;
  pickupAt: string;
};

const SALES_TAX_RATE = 0.08875; // change this if needed
const ASAP_PREP_MINUTES = 20;
const PICKUP_SLOT_INTERVAL_MINUTES = 15;
const MAX_SCHEDULE_DAYS_AHEAD = 7;

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function formatPickupClockTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPickupOptionLabel(
  label: string,
  now: Date,
  minutesFromNow: number
): string {
  const readyAt = addMinutes(now, minutesFromNow);
  return `${label} (ready around ${formatPickupClockTime(readyAt)})`;
}

function buildTimeForToday(now: Date, timeValue: string) {
  const [hour, minute] = timeValue.split(":").map(Number);
  const result = new Date(now);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function roundUpToNextInterval(date: Date, intervalMinutes: number) {
  const result = new Date(date);
  result.setSeconds(0, 0);

  const minutes = result.getMinutes();
  const remainder = minutes % intervalMinutes;

  if (remainder !== 0) {
    result.setMinutes(minutes + (intervalMinutes - remainder));
  }

  return result;
}

function getCurrentOpenWindow(
  hours: RestaurantHourRow[],
  now: Date
): { openAt: Date; closeAt: Date } | null {
  const currentDay = now.getDay();
  const previousDay = currentDay === 0 ? 6 : currentDay - 1;

  const today = hours.find((row) => Number(row.day_of_week) === currentDay);
  const yesterday = hours.find((row) => Number(row.day_of_week) === previousDay);

  if (today && !today.is_closed && today.open_time && today.close_time) {
    const openAt = buildTimeForToday(now, today.open_time);
    const closeAt = buildTimeForToday(now, today.close_time);

    if (closeAt <= openAt) {
      closeAt.setDate(closeAt.getDate() + 1);
    }

    if (now >= openAt && now <= closeAt) {
      return { openAt, closeAt };
    }
  }

  if (
    yesterday &&
    !yesterday.is_closed &&
    yesterday.open_time &&
    yesterday.close_time
  ) {
    const openAt = buildTimeForToday(now, yesterday.open_time);
    openAt.setDate(openAt.getDate() - 1);

    const closeAt = buildTimeForToday(now, yesterday.close_time);
    const yesterdayIsOvernight = yesterday.close_time <= yesterday.open_time;

    if (yesterdayIsOvernight && now >= openAt && now <= closeAt) {
      return { openAt, closeAt };
    }
  }

  return null;
}

function getOpenWindowForDayOffset(
  hours: RestaurantHourRow[],
  now: Date,
  dayOffset: number
): { openAt: Date; closeAt: Date } | null {
  const target = new Date(now);
  target.setDate(target.getDate() + dayOffset);

  const dayIndex = target.getDay();
  const row = hours.find((item) => Number(item.day_of_week) === dayIndex);

  if (!row || row.is_closed || !row.open_time || !row.close_time) {
    return null;
  }

  const openAt = new Date(target);
  const [openHour, openMinute] = row.open_time.split(":").map(Number);
  openAt.setHours(openHour, openMinute, 0, 0);

  const closeAt = new Date(target);
  const [closeHour, closeMinute] = row.close_time.split(":").map(Number);
  closeAt.setHours(closeHour, closeMinute, 0, 0);

  if (closeAt <= openAt) {
    closeAt.setDate(closeAt.getDate() + 1);
  }

  return { openAt, closeAt };
}

function formatScheduledSlotLabel(now: Date, slotTime: Date, dayOffset: number) {
  if (dayOffset === 0) {
    return `Today at ${formatPickupClockTime(slotTime)}`;
  }

  if (dayOffset === 1) {
    return `Tomorrow at ${formatPickupClockTime(slotTime)}`;
  }

  return `${DAY_LABELS[slotTime.getDay()]} at ${formatPickupClockTime(slotTime)}`;
}

function buildPickupOptionsFromHours(
  hours: RestaurantHourRow[],
  now: Date
): PickupOption[] {
  const options: PickupOption[] = [];
  const asapReadyAt = addMinutes(now, ASAP_PREP_MINUTES);
  const currentWindow = getCurrentOpenWindow(hours, now);

  if (currentWindow && asapReadyAt <= currentWindow.closeAt) {
    const asapDate = addMinutes(now, ASAP_PREP_MINUTES);

    options.push({
      value: "ASAP",
      label: formatPickupOptionLabel("ASAP", now, ASAP_PREP_MINUTES),
      pickupAt: asapDate.toISOString(),
    });
  }

  for (let dayOffset = 0; dayOffset < MAX_SCHEDULE_DAYS_AHEAD; dayOffset++) {
    const openWindow = getOpenWindowForDayOffset(hours, now, dayOffset);

    if (!openWindow) {
      continue;
    }

    let slotStart =
      dayOffset === 0
        ? roundUpToNextInterval(
            addMinutes(now, ASAP_PREP_MINUTES),
            PICKUP_SLOT_INTERVAL_MINUTES
          )
        : roundUpToNextInterval(openWindow.openAt, PICKUP_SLOT_INTERVAL_MINUTES);

    if (slotStart < openWindow.openAt) {
      slotStart = roundUpToNextInterval(
        openWindow.openAt,
        PICKUP_SLOT_INTERVAL_MINUTES
      );
    }

    while (slotStart <= openWindow.closeAt) {
      const leadMinutes = Math.max(
        PICKUP_SLOT_INTERVAL_MINUTES,
        Math.round((slotStart.getTime() - now.getTime()) / 60000)
      );

      if (leadMinutes > ASAP_PREP_MINUTES || dayOffset > 0) {
        options.push({
          value: `${leadMinutes} minutes`,
          label: formatScheduledSlotLabel(now, slotStart, dayOffset),
          pickupAt: slotStart.toISOString(),
        });
      }

      slotStart = addMinutes(slotStart, PICKUP_SLOT_INTERVAL_MINUTES);
    }
  }

  return options.filter(
    (option, index, all) =>
      all.findIndex((x) => x.value === option.value) === index
  );
}

export default function CheckoutPage({ params }: PageProps) {
  const [slug, setSlug] = useState("");
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartRestaurantSlug, setCartRestaurantSlug] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupTime, setPickupTime] = useState("ASAP");
  const [pickupMode, setPickupMode] = useState<"asap" | "scheduled">("asap");
  const [notes, setNotes] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [restaurantTimezone, setRestaurantTimezone] = useState("America/New_York");
  const [restaurantHours, setRestaurantHours] = useState<RestaurantHourRow[]>([]);
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
        const supabase = createClient<any>(
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
            setRestaurantHours([]);
            setLoadingPickupOptions(false);
          }
          return;
        }

        const timezone =
          String(restaurantData.timezone || "").trim() || "America/New_York";

        const restaurantNow = new Date(
          new Date().toLocaleString("en-US", {
            timeZone: timezone,
          })
        );

        const { data: hoursData, error: hoursError } = await supabase
          .schema("food_ordering")
          .from("restaurant_hours")
          .select("day_of_week, open_time, close_time, is_closed")
          .eq("restaurant_id", restaurantData.id);

        if (!cancelled) {
          setRestaurantTimezone(timezone);
          setNow(restaurantNow);
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
      setNow(
        new Date(
          new Date().toLocaleString("en-US", {
            timeZone: restaurantTimezone || "America/New_York",
          })
        )
      );
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, [restaurantTimezone]);

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

  const pickupOptions = useMemo(() => {
    if (restaurantHours.length > 0) {
      return buildPickupOptionsFromHours(restaurantHours, now);
    }

    return [
      {
        value: "ASAP",
        label: formatPickupOptionLabel("ASAP", now, ASAP_PREP_MINUTES),
        pickupAt: addMinutes(now, ASAP_PREP_MINUTES).toISOString(),
      },
      {
        value: "15 minutes",
        label: formatPickupOptionLabel("15 minutes", now, 15),
        pickupAt: addMinutes(now, 15).toISOString(),
      },
      {
        value: "30 minutes",
        label: formatPickupOptionLabel("30 minutes", now, 30),
        pickupAt: addMinutes(now, 30).toISOString(),
      },
      {
        value: "45 minutes",
        label: formatPickupOptionLabel("45 minutes", now, 45),
        pickupAt: addMinutes(now, 45).toISOString(),
      },
      {
        value: "60 minutes",
        label: formatPickupOptionLabel("60 minutes", now, 60),
        pickupAt: addMinutes(now, 60).toISOString(),
      },
    ];
  }, [restaurantHours, now]);

  const scheduledPickupOptions = useMemo(
    () => pickupOptions.filter((option) => option.value !== "ASAP"),
    [pickupOptions]
  );

  const selectedPickupLabel = useMemo(() => {
    if (pickupMode === "asap") {
      return (
        pickupOptions.find((option) => option.value === "ASAP")?.label ||
        "ASAP"
      );
    }

    return (
      scheduledPickupOptions.find((option) => option.value === pickupTime)?.label ||
      pickupTime
    );
  }, [pickupMode, pickupOptions, scheduledPickupOptions, pickupTime]);

  const selectedPickupAt = useMemo(() => {
    if (pickupMode === "asap") {
      return (
        pickupOptions.find((option) => option.value === "ASAP")?.pickupAt || ""
      );
    }

    return (
      scheduledPickupOptions.find((option) => option.value === pickupTime)?.pickupAt ||
      ""
    );
  }, [pickupMode, pickupOptions, scheduledPickupOptions, pickupTime]);

  useEffect(() => {
    if (!pickupOptions.length) {
      return;
    }

    const stillValid = pickupOptions.some((option) => option.value === pickupTime);

    if (!stillValid) {
      setPickupTime(pickupOptions[0].value);
    }
  }, [pickupOptions, pickupTime]);

  useEffect(() => {
    if (!pickupOptions.length) {
      return;
    }

    if (pickupMode === "asap") {
      if (pickupOptions.some((option) => option.value === "ASAP")) {
        setPickupTime("ASAP");
        return;
      }

      if (scheduledPickupOptions.length > 0) {
        setPickupMode("scheduled");
        setPickupTime(scheduledPickupOptions[0].value);
      }

      return;
    }

    if (pickupMode === "scheduled") {
      if (!scheduledPickupOptions.length) {
        if (pickupOptions.some((option) => option.value === "ASAP")) {
          setPickupMode("asap");
          setPickupTime("ASAP");
        }
        return;
      }

      if (pickupTime === "ASAP") {
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

    if (!pickupOptions.length) {
      setError("No pickup times are currently available.");
      return;
    }

    if (pickupMode === "scheduled" && !scheduledPickupOptions.length) {
      setError("No scheduled pickup times are currently available.");
      return;
    }

    setSubmitting(true);

    try {
      const pickupDisplayText =
        pickupMode === "asap"
          ? selectedPickupLabel || "ASAP"
          : selectedPickupLabel || pickupTime;

      const payload = {
        restaurantSlug: slug,
        customerName: customerName.trim(),
        customerPhone: normalizedPhone,
        pickupTime: pickupTime.trim() || "ASAP",
        pickupTimeLabel: pickupDisplayText,
        pickupAt: selectedPickupAt,
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

            if (selectedPickupLabel) {
        params.set("pickupLabel", selectedPickupLabel);
      }

      if (selectedPickupAt) {
        params.set("pickupAt", selectedPickupAt);
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
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  Pickup time
                </label>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (pickupOptions.some((option) => option.value === "ASAP")) {
                        setPickupMode("asap");
                      }
                    }}
                    disabled={
                      loadingPickupOptions ||
                      !pickupOptions.some((option) => option.value === "ASAP")
                    }
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
                        "ASAP is not currently available"}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (scheduledPickupOptions.length > 0) {
                        setPickupMode("scheduled");
                      }
                    }}
                    disabled={
                      loadingPickupOptions ||
                      pickupOptions.length === 0 ||
                      scheduledPickupOptions.length === 0
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
                        : "No scheduled pickup times available"}
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