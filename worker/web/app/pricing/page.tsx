import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/app/components/site-footer";

type PricingPlan = {
  name: string;
  badge?: string;
  price: string;
  originalPrice: string;
  cta: string;
  href: string;
  featured: boolean;
  intro: string;
  features: string[];
};

const PRICING_PLANS: PricingPlan[] = [
  {
    name: "Basic",
    badge: "Founding Plan \uD83D\uDD12",
    price: "$29/month",
    originalPrice: "Normally $59",
    cta: "Get Started",
    href: "/onboard",
    featured: true,
    intro: "Recommended starting plan for restaurants launching their ordering line.",
    features: [
      "Dedicated ordering line",
      "125 calls / month",
      "400 SMS / month",
      "Missed call \u2192 SMS link",
      "Order notifications: confirmed and ready",
      "Simple dashboard",
    ],
  },
  {
    name: "Pro",
    price: "$39/month",
    originalPrice: "Normally $69",
    cta: "Start Pro",
    href: "/onboard?plan=pro",
    featured: false,
    intro: "Everything in Basic +",
    features: [
      "Menu image upgrades",
      "Promotions display",
      "Better storefront experience",
    ],
  },
  {
    name: "Pro Plus",
    price: "$49/month",
    originalPrice: "Normally $79",
    cta: "Start Pro Plus",
    href: "/onboard?plan=pro_plus",
    featured: false,
    intro: "Everything in Pro +",
    features: [
      "Assisted onboarding coming soon",
      "Priority support",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#081120] text-[#e7eef9]">
      <div className="mx-auto max-w-[1140px] px-6">
        <nav className="flex flex-col gap-4 py-5 md:flex-row md:items-start md:justify-between">
          <Link
            href="/"
            className="flex min-w-0 flex-col items-start gap-2"
            aria-label="Saana home"
          >
            <div className="rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02))] px-3 py-2 shadow-[0_14px_34px_rgba(0,0,0,.22)]">
              <Image
                src="/logo.svg"
                alt="Saana logo"
                width={208}
                height={44}
                priority
                className="h-auto w-[150px] md:w-[208px]"
              />
            </div>
            <div className="pl-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9cadc5] md:text-[12px]">
              Restaurant Missed Call Recovery
            </div>
          </Link>

          <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:items-center md:gap-3">
            <Link
              href="/pricing"
              className="inline-flex h-10 items-center justify-center rounded-[12px] border border-white/12 bg-white/[0.03] px-3 py-2 text-[13px] font-extrabold text-[#e7eef9] transition hover:-translate-y-[1px] md:h-auto md:rounded-[14px] md:px-5 md:py-3 md:text-base"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-[12px] border border-white/12 bg-white/[0.03] px-3 py-2 text-[13px] font-extrabold text-[#e7eef9] transition hover:-translate-y-[1px] md:h-auto md:rounded-[14px] md:px-5 md:py-3 md:text-base"
            >
              Login
            </Link>
            <Link
              href="/onboard"
              className="inline-flex h-10 items-center justify-center rounded-[12px] bg-[#ff8a3d] px-3 py-2 text-[13px] font-extrabold text-[#211307] shadow-[0_12px_28px_rgba(255,138,61,.24)] transition hover:-translate-y-[1px] md:h-auto md:rounded-[14px] md:px-5 md:py-3 md:text-base"
            >
              Get Started
            </Link>
            <Link
              href="/#demo"
              className="inline-flex h-10 items-center justify-center rounded-[12px] border border-white/12 bg-white/[0.03] px-3 py-2 text-[13px] font-extrabold text-[#e7eef9] transition hover:-translate-y-[1px] md:h-auto md:rounded-[14px] md:px-5 md:py-3 md:text-base"
            >
              Book a demo
            </Link>
          </div>
        </nav>

        <section className="grid gap-8 py-8 pb-12 lg:grid-cols-[1.02fr_.98fr] lg:items-center">
          <div>
            <div className="inline-flex items-center rounded-full border border-[#ff8a3d]/20 bg-[#ff8a3d]/12 px-3 py-2 text-[12px] font-black uppercase tracking-[0.08em] text-[#ffc8a2]">
              Founding pricing for launch
            </div>
            <h1 className="mt-5 max-w-[11ch] text-[44px] font-black leading-[0.92] tracking-[-0.05em] text-[#f8fbff] md:max-w-none md:text-6xl md:leading-none md:tracking-[-0.045em]">
              Turn missed calls into orders
            </h1>
            <p className="mt-4 max-w-[680px] text-lg text-[#a7b6cc] md:text-xl">
              Get your own ordering line. Customers call, receive a link, and
              place orders instantly.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/onboard"
                className="inline-flex items-center justify-center rounded-[14px] bg-[#ff8a3d] px-5 py-3 font-extrabold text-[#211307] shadow-[0_12px_28px_rgba(255,138,61,.24)] transition hover:-translate-y-[1px]"
              >
                Get Started - $29
              </Link>
              <Link
                href="/#demo"
                className="inline-flex items-center justify-center rounded-[14px] border border-white/12 bg-white/[0.03] px-5 py-3 font-extrabold text-[#e7eef9] transition hover:-translate-y-[1px]"
              >
                Book a Demo
              </Link>
              <Link
                href="#plans"
                className="inline-flex items-center justify-center rounded-[14px] border border-white/12 bg-white/[0.03] px-5 py-3 font-extrabold text-[#e7eef9] transition hover:-translate-y-[1px]"
              >
                See plans
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
            <div className="rounded-[22px] border border-[#ff8a3d]/20 bg-[#ff8a3d]/10 p-5">
              <p className="text-sm font-black uppercase tracking-[0.08em] text-[#ffc8a2]">
                \uD83C\uDF89 Founding Pricing - First 100 Restaurants
              </p>
              <p className="mt-2 text-3xl font-black text-[#f8fbff]">
                $29/month Founding Plan
              </p>
              <p className="mt-1 text-sm text-[#a7b6cc]">Normally $59/month</p>
              <p className="mt-4 text-base text-[#d8e0ec]">
                First 100 restaurants lock this price forever.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                "Dedicated ordering line included",
                "125 calls/month + 400 SMS/month",
                "Warning at 80% usage",
                "Auto top-up available with no service interruption",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[18px] border border-white/10 bg-[rgba(8,17,32,.74)] p-4 text-sm text-[#d8e0ec]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="plans"
          className="grid gap-4 py-4 lg:grid-cols-3 lg:items-stretch"
        >
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-[28px] border p-6 shadow-[0_18px_60px_rgba(0,0,0,.28)] ${
                plan.featured
                  ? "border-[#ff8a3d]/30 bg-[linear-gradient(180deg,rgba(255,138,61,.14),rgba(255,255,255,.05))]"
                  : "border-white/10 bg-white/[0.05]"
              }`}
            >
              {plan.badge ? (
                <div className="inline-flex rounded-full border border-[#ff8a3d]/20 bg-[#ff8a3d]/12 px-3 py-1 text-[12px] font-black uppercase tracking-[0.08em] text-[#ffc8a2]">
                  {plan.badge}
                </div>
              ) : null}
              {plan.featured ? (
                <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[12px] font-black uppercase tracking-[0.08em] text-[#f8fbff]">
                  Recommended starting plan
                </div>
              ) : null}

              <h2 className="mt-4 text-2xl font-black text-[#f8fbff]">
                {plan.name}
              </h2>
              <div className="mt-3 flex items-end gap-3">
                <p className="text-3xl font-black text-[#f8fbff]">{plan.price}</p>
                <p className="pb-1 text-sm text-[#9cadc5]">{plan.originalPrice}</p>
              </div>
              <p className="mt-4 text-sm text-[#a7b6cc]">{plan.intro}</p>

              <div className="mt-5 space-y-3">
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    className="rounded-[18px] border border-white/10 bg-[rgba(8,17,32,.74)] px-4 py-3 text-sm text-[#d8e0ec]"
                  >
                    {feature}
                  </div>
                ))}
              </div>

              <Link
                href={plan.href}
                className={`mt-6 inline-flex w-full items-center justify-center rounded-[14px] px-5 py-3 text-center font-extrabold transition hover:-translate-y-[1px] ${
                  plan.featured
                    ? "bg-[#ff8a3d] text-[#211307] shadow-[0_12px_28px_rgba(255,138,61,.24)]"
                    : "border border-white/12 bg-white/[0.03] text-[#e7eef9]"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </section>

        <section className="grid gap-4 py-12 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
            <h2 className="text-2xl font-black text-[#f8fbff]">
              Your ordering line
            </h2>
            <p className="mt-3 text-base text-[#a7b6cc]">
              Each restaurant gets a dedicated phone number. Customers call,
              receive a link, and place orders. No shared numbers. No confusion.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
            <h2 className="text-2xl font-black text-[#f8fbff]">
              What happens if I exceed usage?
            </h2>
            <div className="mt-4 space-y-3 text-sm text-[#d8e0ec]">
              <div className="rounded-[18px] border border-white/10 bg-[rgba(8,17,32,.74)] px-4 py-3">
                Warning at 80%
              </div>
              <div className="rounded-[18px] border border-white/10 bg-[rgba(8,17,32,.74)] px-4 py-3">
                Auto top-up: $10
              </div>
              <div className="rounded-[18px] border border-white/10 bg-[rgba(8,17,32,.74)] px-4 py-3">
                Adds +100 calls / +300 SMS
              </div>
              <div className="rounded-[18px] border border-white/10 bg-[rgba(8,17,32,.74)] px-4 py-3">
                No rollover and no service interruption
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
          <div className="grid gap-3 md:grid-cols-3">
            {["No contracts", "Cancel anytime", "No setup fees"].map((item) => (
              <div
                key={item}
                className="rounded-[18px] border border-white/10 bg-[rgba(8,17,32,.74)] px-4 py-4 text-center text-sm font-bold text-[#f8fbff]"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="py-12">
          <div className="rounded-[28px] border border-[#ff8a3d]/20 bg-[linear-gradient(180deg,rgba(255,138,61,.14),rgba(255,255,255,.05))] p-6 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
            <h2 className="text-3xl font-black text-[#f8fbff]">
              Start your ordering line today
            </h2>
            <p className="mt-3 max-w-[720px] text-[#d8e0ec]">
              Get started now or talk to us first if you want a quick demo of
              the missed-call recovery flow.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/onboard"
                className="inline-flex items-center justify-center rounded-[14px] bg-[#ff8a3d] px-5 py-3 font-extrabold text-[#211307] shadow-[0_12px_28px_rgba(255,138,61,.24)] transition hover:-translate-y-[1px]"
              >
                Get Started - $29
              </Link>
              <Link
                href="/#demo"
                className="inline-flex items-center justify-center rounded-[14px] border border-white/12 bg-white/[0.03] px-5 py-3 font-extrabold text-[#e7eef9] transition hover:-translate-y-[1px]"
              >
                Talk to us
              </Link>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
