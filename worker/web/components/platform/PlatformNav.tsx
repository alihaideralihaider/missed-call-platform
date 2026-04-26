"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  {
    href: "/platform/trust/onboarding",
    label: "Onboarding Review",
  },
  {
    href: "/platform/trust/restaurants",
    label: "Restaurant Controls",
  },
  {
    href: "/platform/trust/ip-risk",
    label: "IP Risk",
  },
  {
    href: "/platform/trust/activity",
    label: "Activity",
  },
];

function linkClass(active: boolean) {
  if (active) {
    return "shrink-0 rounded-full bg-neutral-900 px-3 py-2 text-sm font-semibold text-white";
  }

  return "shrink-0 rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700";
}

export default function PlatformNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Platform admin navigation"
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      {ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link key={item.href} href={item.href} className={linkClass(active)}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
