import Link from "next/link";

import { CTAButton } from "@/components/marketing/CTAButton";
import { saanaColors } from "@/lib/brand/colors";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Pricing", href: "/pricing" },
  { label: "How It Works", href: "/#how-it-works" },
];

export function MarketingHeader() {
  return (
    <header
      className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur"
      style={{ borderColor: saanaColors.border }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-3 px-4 py-3 sm:px-6 sm:py-4 lg:flex-nowrap lg:gap-x-6 lg:px-8">
        <Link href="/" aria-label="SaanaOS home" className="flex min-w-0 shrink-0 items-center">
          <img
            src="/brand/logos/saanaos-logo-horizontal.svg"
            alt="SaanaOS"
            width={320}
            height={81}
            className="h-auto w-[170px] sm:w-[230px] lg:w-[290px]"
          />
        </Link>

        <nav
          aria-label="Main navigation"
          className="order-3 flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-semibold sm:text-sm lg:order-2 lg:w-auto lg:flex-1 lg:gap-6"
          style={{ color: saanaColors.navy }}
        >
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:opacity-70">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="order-2 flex shrink-0 items-center lg:order-3">
          <CTAButton href="/onboard" className="px-4 py-2.5 text-xs sm:px-5 sm:py-3 sm:text-sm">
            Book Setup
          </CTAButton>
        </div>
      </div>
    </header>
  );
}
