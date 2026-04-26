"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  slug: string;
};

type NavItem = {
  href: string;
  label: string;
};

function linkClass(active: boolean): string {
  if (active) {
    return "shrink-0 rounded-full bg-neutral-900 px-3 py-2 text-sm font-semibold text-white";
  }

  return "shrink-0 rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700";
}

export default function RestaurantAdminNav({ slug }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const basePath = `/admin/restaurants/${slug}`;
  const isOrdersPage = pathname === `${basePath}/orders`;

  const items: NavItem[] = [
    { href: `${basePath}/orders`, label: "Orders" },
    { href: `${basePath}/billing`, label: "Billing" },
    { href: `${basePath}/setup`, label: "Setup" },
    { href: `${basePath}/menu`, label: "Menu" },
    { href: `${basePath}/assets`, label: "Assets" },
    { href: `${basePath}/promotions`, label: "Promotions" },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <nav
        aria-label="Restaurant admin navigation"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== `${basePath}/orders` &&
              pathname.startsWith(`${item.href}/`));

          return (
            <Link key={item.href} href={item.href} className={linkClass(active)}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {isOrdersPage ? (
        <button
          type="button"
          onClick={() => router.refresh()}
          className="shrink-0 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Refresh orders
        </button>
      ) : null}
    </div>
  );
}
