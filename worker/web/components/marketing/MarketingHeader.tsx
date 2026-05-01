import Link from "next/link";

import { CTAButton } from "@/components/marketing/CTAButton";
import { saanaColors } from "@/lib/brand/colors";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Pricing", href: "/pricing" },
  { label: "How it Works", href: "/#how-it-works" },
];

export function MarketingHeader() {
  return (
    <header
      className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur"
      style={{ borderColor: saanaColors.border }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="SaanaOS home" className="flex shrink-0 items-center">
          <img
            src="/brand/logos/saanaos-logo-horizontal.svg"
            alt="SaanaOS"
            width={320}
            height={81}
            className="h-auto w-[250px] sm:w-[292px]"
          />
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-7 text-sm font-semibold md:flex"
          style={{ color: saanaColors.navy }}
        >
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:opacity-70">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <CTAButton href="/onboard" className="hidden sm:inline-flex">
            Book Setup
          </CTAButton>
          <CTAButton href="/onboard" className="sm:hidden" variant="secondary">
            Get Started
          </CTAButton>
        </div>
      </div>
    </header>
  );
}
