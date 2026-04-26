"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CartItem,
  clearCart,
  getCartItems,
  getCartRestaurantSlug,
  removeFromCart,
  subscribeToCartUpdates,
  updateCartItemQuantity,
} from "@/lib/cart";

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

export default function CartPage({ params }: PageProps) {
  const [slug, setSlug] = useState("");
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartRestaurantSlug, setCartRestaurantSlug] = useState<string | null>(null);

  function refresh() {
    setItems(getCartItems());
    setCartRestaurantSlug(getCartRestaurantSlug());
  }

  useEffect(() => {
    params.then((resolved) => {
      setSlug(cleanSlug(resolved?.slug));
    });
    const refreshTimer = window.setTimeout(() => {
      refresh();
    }, 0);

    const unsubscribe = subscribeToCartUpdates(() => {
      refresh();
    });

    return () => {
      window.clearTimeout(refreshTimer);
      unsubscribe();
    };
  }, [params]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const hasSoldOutItems = useMemo(
    () => items.some((item) => item.is_sold_out),
    [items]
  );

  const restaurantName = formatRestaurantName(slug);

  const cartBelongsToThisRestaurant =
    !cartRestaurantSlug || !slug || cartRestaurantSlug === slug;

  const handleDecrease = (item: CartItem) => {
    const nextQuantity = item.quantity - 1;
    const identifier = item.lineId || item.id;

    if (nextQuantity <= 0) {
      removeFromCart(identifier);
      return;
    }

    updateCartItemQuantity(identifier, nextQuantity);
  };

  const handleIncrease = (item: CartItem) => {
    updateCartItemQuantity(item.lineId || item.id, item.quantity + 1);
  };

  const handleClearCart = () => {
    clearCart();
  };

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

            <div className="mt-5 space-y-3">
              <button
                onClick={handleClearCart}
                className="w-full rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white"
              >
                Clear cart
              </button>

              <Link
                href={`/r/${slug}`}
                className="block w-full rounded-2xl border border-neutral-200 px-4 py-3 text-center text-sm font-semibold text-neutral-900"
              >
                Go to menu
              </Link>
            </div>
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
            href={`/r/${slug}`}
            className="text-sm font-medium text-neutral-500"
          >
            ← Back to menu
          </Link>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Pickup order
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
                Your order
              </h1>
              <p className="mt-1 text-sm text-neutral-500">{restaurantName}</p>
            </div>

            {items.length > 0 ? (
              <button
                onClick={handleClearCart}
                className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <div className="px-4 pb-36 pt-4">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
              <h2 className="text-lg font-semibold text-neutral-900">
                Your cart is empty
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Add items from the menu to start your order.
              </p>

              <Link
                href={`/r/${slug}`}
                className="mt-5 inline-block rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white"
              >
                Browse menu
              </Link>
            </div>
          ) : (
            <>
              {hasSoldOutItems ? (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-700">
                    One or more items in your cart are sold out. Remove them to continue.
                  </p>
                </div>
              ) : null}

              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.lineId || item.id}
                    className={`rounded-2xl border p-4 shadow-sm ${
                      item.is_sold_out
                        ? "border-red-200 bg-red-50"
                        : "border-neutral-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-neutral-900">
                          {item.name}
                        </p>

                        {Array.isArray(item.modifiers) && item.modifiers.length > 0 ? (
                          <div className="mt-2 space-y-1">
                            {item.modifiers.map((modifier) => (
                              <p
                                key={`${modifier.groupId}-${modifier.optionId}`}
                                className="text-xs text-neutral-600"
                              >
                                + {modifier.optionName}
                              </p>
                            ))}
                          </div>
                        ) : null}

                        {item.is_sold_out ? (
                          <span className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            Sold Out
                          </span>
                        ) : null}

                        <p className="mt-1 text-sm text-neutral-500">
                          ${item.price.toFixed(2)} each
                        </p>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.lineId || item.id)}
                        className="text-sm font-medium text-neutral-500"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-full border border-neutral-200 bg-white">
                        <button
                          onClick={() => handleDecrease(item)}
                          className="h-10 w-10 text-lg font-semibold text-neutral-900"
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          −
                        </button>

                        <span className="min-w-10 text-center text-sm font-semibold text-neutral-900">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => handleIncrease(item)}
                          className="h-10 w-10 text-lg font-semibold text-neutral-900"
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          +
                        </button>
                      </div>

                      <p className="text-sm font-semibold text-neutral-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                <h2 className="text-base font-semibold text-neutral-900">
                  Order summary
                </h2>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between text-neutral-600">
                    <span>
                      Subtotal ({itemCount} item{itemCount > 1 ? "s" : ""})
                    </span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-600">
                    <span>Pickup</span>
                    <span>Free</span>
                  </div>

                  <div className="border-t border-neutral-200 pt-3">
                    <div className="flex items-center justify-between text-base font-bold text-neutral-900">
                      <span>Total</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {items.length > 0 ? (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 p-3 backdrop-blur">
            <div className="mx-auto w-full max-w-md">
              {hasSoldOutItems ? (
                <div className="rounded-2xl bg-red-600 px-4 py-4 text-center text-sm font-semibold text-white shadow-lg">
                  Remove sold out items to continue
                </div>
              ) : (
                <Link
                  href={`/r/${slug}/checkout`}
                  className="flex w-full items-center justify-between rounded-2xl bg-neutral-900 px-4 py-4 text-white shadow-lg transition active:scale-[0.98]"
                >
                  <span className="text-sm font-semibold">
                    Continue checkout
                  </span>
                  <span className="text-sm font-semibold">
                    ${subtotal.toFixed(2)}
                  </span>
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
