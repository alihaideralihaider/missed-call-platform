"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import StickyCartBar from "./StickyCartBar";
import { addToCart, syncCartWithMenu } from "@/lib/cart";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  is_sold_out?: boolean;
  image_url?: string | null;
  description?: string | null;
  base_price?: number | null;
  compare_at_price?: number | null;
  is_featured?: boolean;
  order_count?: number | null;
  last_ordered_at?: string | null;
};

type Promotion = {
  id: string;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  image_url?: string | null;
};

type Props = {
  items: MenuItem[];
  restaurantName: string;
  hasVibeUpgrade: boolean;
  hasMenuUpgrade: boolean;
  vibeImageUrl: string | null;
  hasPromotions?: boolean;
  promotions?: Promotion[];
};

function cleanSlug(value: unknown): string {
  const s = String(value ?? "").trim().toLowerCase();
  return s && s !== "undefined" && s !== "null" ? s : "";
}

function formatPrice(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getReferencePrice(item: MenuItem): number | null {
  const compareAt = Number(item.compare_at_price);
  const basePrice = Number(item.base_price);

  if (Number.isFinite(compareAt) && compareAt > item.price) {
    return compareAt;
  }

  if (Number.isFinite(basePrice) && basePrice > item.price) {
    return basePrice;
  }

  return null;
}

function hasPriceDeal(item: MenuItem): boolean {
  return getReferencePrice(item) !== null;
}

export default function RestaurantMenuClient({
  items,
  restaurantName,
  hasVibeUpgrade,
  hasMenuUpgrade,
  vibeImageUrl,
  hasPromotions = false,
  promotions = [],
}: Props) {
  const params = useParams<{ slug: string }>();
  const safeSlug = cleanSlug(params?.slug);
  const [smsOptIn, setSmsOptIn] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sms_opt_in");
    setSmsOptIn(saved === "1");
  }, []);

  useEffect(() => {
    if (!safeSlug || !items.length) return;
    syncCartWithMenu(safeSlug, items);
  }, [safeSlug, items]);

  const popularItems = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        const aFeatured = a.is_featured ? 1 : 0;
        const bFeatured = b.is_featured ? 1 : 0;

        if (bFeatured !== aFeatured) {
          return bFeatured - aFeatured;
        }

        const aOrders = Number(a.order_count || 0);
        const bOrders = Number(b.order_count || 0);

        if (bOrders !== aOrders) {
          return bOrders - aOrders;
        }

        const aLastOrdered = a.last_ordered_at
          ? new Date(a.last_ordered_at).getTime()
          : 0;
        const bLastOrdered = b.last_ordered_at
          ? new Date(b.last_ordered_at).getTime()
          : 0;

        return bLastOrdered - aLastOrdered;
      })
      .slice(0, 6);
  }, [items]);

  const showVibeHero = Boolean(hasVibeUpgrade && vibeImageUrl);
  const showPromotions = Boolean(hasPromotions && promotions.length > 0);

  return (
    <div className="min-h-screen bg-neutral-100">
      <main className="mx-auto min-h-screen max-w-md bg-white shadow-sm">
        <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
          <header className="px-4 pb-3 pt-4">
            {showVibeHero ? (
              <div className="relative overflow-hidden rounded-2xl">
                <img
                  src={vibeImageUrl!}
                  alt={`${restaurantName} vibe`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/20" />
                <div className="relative p-4">
                  <HeaderContent restaurantName={restaurantName} isVibe />
                </div>
              </div>
            ) : (
              <div>
                <HeaderContent restaurantName={restaurantName} />
              </div>
            )}

            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
              <input
                type="checkbox"
                checked={smsOptIn}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSmsOptIn(checked);
                  localStorage.setItem("sms_opt_in", checked ? "1" : "0");
                }}
                className="mt-1 h-4 w-4 rounded border-neutral-300"
              />
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  Send me text updates about this order
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Message frequency varies per order. Reply STOP to opt out,
                  HELP for help. Consent is not a condition of purchase.
                </p>
              </div>
            </label>
          </header>

          <div className="overflow-x-auto border-t border-neutral-100">
            <div className="flex gap-2 px-4 py-3">
              {showPromotions ? (
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("promotions-section")
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                  }
                  className="whitespace-nowrap rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700"
                >
                  Promotions
                </button>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  document.getElementById("popular-section")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
                className="whitespace-nowrap rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700"
              >
                Popular
              </button>

              <button
                type="button"
                onClick={() =>
                  document.getElementById("menu-section")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
                className="whitespace-nowrap rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700"
              >
                Menu
              </button>
            </div>
          </div>
        </div>

        <div className="pb-28">
          {showPromotions ? (
            <section
              id="promotions-section"
              className="scroll-mt-36 border-b border-neutral-100 px-4 py-4"
            >
              <h2 className="text-lg font-semibold text-neutral-900">
                Promotions
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Special offers and featured deals
              </p>

              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {promotions.map((promo) => (
                  <div
                    key={promo.id}
                    className="w-[280px] shrink-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
                  >
                    <div className="relative h-16 w-full bg-neutral-100">
                      {promo.image_url ? (
                        <img
                          src={promo.image_url}
                          alt={promo.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs font-medium text-neutral-400">
                          Promotion image
                        </div>
                      )}

                      {promo.badge ? (
                        <span className="absolute left-3 top-3 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                          {promo.badge}
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0 p-4">
                      <p className="truncate text-base font-semibold text-neutral-900">
                        {promo.title}
                      </p>
                      {promo.subtitle ? (
                        <p className="mt-1 truncate text-sm text-neutral-500">
                          {promo.subtitle}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section
            id="popular-section"
            className="scroll-mt-36 border-b border-neutral-100 px-4 py-4"
          >
            <h2 className="text-lg font-semibold text-neutral-900">Popular</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Quick picks for fast ordering
            </p>

            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {popularItems.map((item) => {
                const referencePrice = getReferencePrice(item);
                const showDeal = hasPriceDeal(item);

                return (
                  <div key={`popular-wrap-${item.id}`} className="w-[200px] shrink-0">
                    <button
                      type="button"
                      disabled={item.is_sold_out}
                      onClick={() => {
                        if (!safeSlug || item.is_sold_out) {
                          if (!safeSlug) {
                            console.error(
                              "Missing restaurant slug in RestaurantMenuClient"
                            );
                          }
                          return;
                        }

                        addToCart(safeSlug, {
                          id: item.id,
                          name: item.name,
                          price: item.price,
                          is_sold_out: item.is_sold_out,
                        });
                      }}
                      className={`w-full overflow-hidden rounded-2xl border text-left shadow-sm transition ${
                        item.is_sold_out
                          ? "cursor-not-allowed border-neutral-200 bg-neutral-100 opacity-60"
                          : "border-neutral-200 bg-white active:scale-[0.99]"
                      }`}
                    >
                      <div className="relative h-24 bg-neutral-100">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs font-medium text-neutral-400">
                            {hasMenuUpgrade ? "Menu image" : "Item image"}
                          </div>
                        )}

                        {item.is_featured ? (
                          <span className="absolute left-3 top-3 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                            Popular
                          </span>
                        ) : null}
                      </div>

                      <div className="min-w-0 p-3">
                        <p className="truncate text-sm font-semibold text-neutral-900">
                          {item.name}
                        </p>

                        {item.description ? (
                          <p className="mt-1 truncate text-[11px] text-neutral-500">
                            {item.description}
                          </p>
                        ) : null}

                        {item.is_sold_out ? (
                          <span className="mt-2 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            Sold Out
                          </span>
                        ) : null}

                        {showDeal ? (
                          <span className="mt-2 inline-block rounded bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                            Deal
                          </span>
                        ) : null}

                        <div className="mt-2 flex items-center gap-1.5">
                          <p className="text-sm font-semibold leading-none text-neutral-900">
                            {formatPrice(item.price)}
                          </p>

                          {referencePrice ? (
                            <p className="text-[11px] text-neutral-400 line-through">
                              {formatPrice(referencePrice)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section id="menu-section" className="scroll-mt-36 px-4 py-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-neutral-900">Menu</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Tap add to build your order
              </p>
            </div>

            <div className="space-y-3">
              {items.map((item) => {
                const referencePrice = getReferencePrice(item);
                const showDeal = hasPriceDeal(item);

                return (
                  <div
                    key={item.id}
                    className={`overflow-hidden rounded-2xl border shadow-sm ${
                      item.is_sold_out
                        ? "border-neutral-200 bg-neutral-100 opacity-70"
                        : "border-neutral-200 bg-white"
                    }`}
                  >
                    {item.image_url ? (
                      <div className="h-44 w-full bg-neutral-100">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold leading-5 text-neutral-900">
                          {item.name}
                        </p>

                        {item.description ? (
                          <p className="mt-1 text-sm text-neutral-500">
                            {item.description}
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-neutral-500">
                            Freshly prepared for pickup
                          </p>
                        )}

                        {item.is_sold_out ? (
                          <span className="mt-2 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            Sold Out
                          </span>
                        ) : null}

                        {showDeal ? (
                          <span className="mt-2 inline-block rounded bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                            Deal
                          </span>
                        ) : null}

                        <div className="mt-2 flex items-center gap-2">
                          <p className="text-sm font-semibold text-neutral-900">
                            {formatPrice(item.price)}
                          </p>

                          {referencePrice ? (
                            <p className="text-xs text-neutral-400 line-through">
                              {formatPrice(referencePrice)}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={item.is_sold_out}
                        onClick={() => {
                          if (!safeSlug || item.is_sold_out) {
                            if (!safeSlug) {
                              console.error(
                                "Missing restaurant slug in RestaurantMenuClient"
                              );
                            }
                            return;
                          }

                          addToCart(safeSlug, {
                            id: item.id,
                            name: item.name,
                            price: item.price,
                            is_sold_out: item.is_sold_out,
                          });
                        }}
                        className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-[0.98] ${
                          item.is_sold_out
                            ? "cursor-not-allowed bg-neutral-300 text-neutral-500"
                            : "bg-neutral-900 text-white hover:bg-black"
                        }`}
                      >
                        {item.is_sold_out ? "Sold Out" : "Add"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <StickyCartBar slug={safeSlug} />
      </main>
    </div>
  );
}

function HeaderContent({
  restaurantName,
  isVibe,
}: {
  restaurantName: string;
  isVibe?: boolean;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-xs font-medium uppercase tracking-wide ${
              isVibe ? "text-white/80" : "text-neutral-500"
            }`}
          >
            Pickup only
          </p>
          <h1
            className={`mt-1 truncate text-2xl font-bold tracking-tight ${
              isVibe ? "text-white" : "text-neutral-900"
            }`}
          >
            {restaurantName}
          </h1>
          <p
            className={`mt-1 text-sm ${
              isVibe ? "text-white/90" : "text-neutral-500"
            }`}
          >
            Order ahead for pickup
          </p>
        </div>

        <div className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200">
          Open
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Pickup
        </button>
        <button
          type="button"
          disabled
          className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-400"
        >
          Delivery
        </button>
      </div>
    </>
  );
}