import Link from "next/link";

import { saanaColors } from "@/lib/brand/colors";
import { saanaBrandCopy } from "@/lib/brand/copy";

const footerLinks = [
  { label: "Home", href: "/" },
  { label: "Pricing", href: "/pricing" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Missed Call Recovery", href: "/restaurant-missed-call-recovery" },
  { label: "SMS Ordering", href: "/sms-ordering-for-restaurants" },
  { label: "Increase Orders", href: "/increase-restaurant-orders" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "SMS Policy", href: "/sms-policy" },
  { label: "Compliance", href: "/compliance" },
];

export function MarketingFooter() {
  return (
    <footer
      className="border-t px-4 py-10 sm:px-6 lg:px-8"
      style={{
        backgroundColor: saanaColors.softBackground,
        borderColor: saanaColors.border,
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div>
          <img
            src="/brand/logos/saanaos-logo-horizontal.svg"
            alt="SaanaOS"
            width={220}
            height={56}
            className="h-auto w-[200px]"
          />
          <p className="mt-3 text-sm" style={{ color: saanaColors.muted }}>
            {saanaBrandCopy.tagline}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold"
            style={{ color: saanaColors.navy }}
          >
            {footerLinks.map((item) => (
              <Link key={item.href} href={item.href} className="hover:opacity-70">
                {item.label}
              </Link>
            ))}
          </nav>

          <nav
            aria-label="Legal navigation"
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm"
            style={{ color: saanaColors.muted }}
          >
            {legalLinks.map((item) => (
              <Link key={item.href} href={item.href} className="hover:opacity-70">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
