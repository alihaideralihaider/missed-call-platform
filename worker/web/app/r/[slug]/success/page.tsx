"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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

export default function SuccessPage({ params }: PageProps) {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const orderNumber = searchParams.get("orderNumber");
  const pickupLabel = searchParams.get("pickupLabel");
  const pickupAt = searchParams.get("pickupAt");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    params.then((resolved) => {
      setSlug(cleanSlug(resolved?.slug));
    });
  }, [params]);

  const restaurantName = formatRestaurantName(slug);

  const displayOrderRef = useMemo(() => {
    const cleanOrderNumber = String(orderNumber ?? "").trim();
    if (cleanOrderNumber) {
      return cleanOrderNumber;
    }

    return formatFallbackOrderRef(orderId, slug);
  }, [orderNumber, orderId, slug]);

  const formattedPickupAt = useMemo(
    () => formatPickupDateTime(pickupAt),
    [pickupAt]
  );

  const displayPickupText = useMemo(() => {
    const cleanPickupLabel = String(pickupLabel ?? "").trim();
    if (cleanPickupLabel) {
      return cleanPickupLabel;
    }

    if (formattedPickupAt) {
      return formattedPickupAt;
    }

    return "20–30 minutes";
  }, [pickupLabel, formattedPickupAt]);

  const pickupHelperText = useMemo(() => {
    if (String(pickupLabel ?? "").trim() || formattedPickupAt) {
      return "Please head to the restaurant at your selected pickup time.";
    }

    return "Please head to the restaurant at your selected pickup time.";
  }, [pickupLabel, formattedPickupAt]);

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto flex min-h-screen max-w-md items-center bg-white px-4 py-6 shadow-sm">
        <div className="w-full rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl">
            ✓
          </div>

          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Pickup order placed
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">
            Thank you
          </h1>

          <p className="mt-2 text-sm text-neutral-600">
            Your order has been sent to {restaurantName}.
          </p>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
              Estimated ready time
            </p>
            <p className="mt-1 text-lg font-bold text-amber-900">
              {displayPickupText}
            </p>
          </div>

          <p className="mt-2 text-sm text-neutral-500">
            {pickupHelperText}
          </p>

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