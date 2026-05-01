"use client";

import { useEffect, useState } from "react";
import { cartCount, cartTotal, subscribeToCartUpdates } from "@/lib/cart";

type Props = {
  slug: string;
};

export default function StickyCartBar({ slug }: Props) {
  const [cartSummary, setCartSummary] = useState(() => ({
    count: cartCount(),
    total: cartTotal(),
  }));

  function refresh() {
    setCartSummary({
      count: cartCount(),
      total: cartTotal(),
    });
  }

  useEffect(() => {
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
  }, []);

  const { count, total } = cartSummary;

  if (count === 0) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 p-3 backdrop-blur"
      aria-live="polite"
    >
      <div className="mx-auto w-full max-w-md">
        <a
          href={`/r/${slug}/cart`}
          className="flex w-full items-center justify-between rounded-2xl bg-neutral-900 px-4 py-4 text-white shadow-lg transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 active:scale-[0.98]"
          aria-label={`View order with ${count} item${count > 1 ? "s" : ""}, total ${total.toFixed(2)} dollars`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/20 px-2 text-xs">
              {count}
            </span>
            <span>item{count > 1 ? "s" : ""}</span>
          </div>

          <span className="text-sm font-semibold">View order</span>

          <span className="text-sm font-semibold">${total.toFixed(2)}</span>
        </a>
      </div>
    </div>
  );
}
