import type { Metadata } from "next";

import { FloatingPattern } from "@/components/brand/FloatingPattern";
import { CTAButton } from "@/components/marketing/CTAButton";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { SectionShell } from "@/components/marketing/SectionShell";
import { TrustLine } from "@/components/marketing/TrustLine";
import { saanaColors } from "@/lib/brand/colors";

export const metadata: Metadata = {
  title: "SaanaOS Pricing | Missed Call Recovery and Restaurant Website Packages",
  description:
    "Simple SaanaOS pricing for restaurant missed-call recovery, dedicated phone lines, SMS ordering links, website setup, menu, checkout, hosting, maintenance, and SEO support.",
  alternates: {
    canonical: "/pricing",
  },
};

const missedCallPlans = [
  {
    name: "Basic",
    href: "/onboard",
    regularPrice: "$69/month",
    introPrice: "$39/month",
    bullets: [
      "Missed call automation",
      "IVR consent prompt",
      "SMS order link sent automatically",
      "Pickup order recovery",
      "Basic setup support",
    ],
  },
  {
    name: "Pro",
    href: "/onboard?plan=pro",
    regularPrice: "$79/month",
    introPrice: "$49/month",
    bullets: [
      "Everything in Basic",
      "More monthly call & SMS usage",
      "Priority setup support",
      "Stronger recovery for busy locations",
      "Built for growing restaurants",
    ],
  },
];

const websiteProducts = [
  {
    name: "Website Development",
    price: "$100 one-time",
    note: "Per location",
    bullets: [
      "Basic restaurant website",
      "Menu page included",
      "Pickup checkout included",
      "Mobile-friendly setup",
    ],
  },
  {
    name: "Hosting & Maintenance",
    price: "$20/month",
    note: "Per location",
    bullets: [
      "Hosting included",
      "Basic maintenance",
      "Small content updates",
      "Keep your site running smoothly",
    ],
  },
];

const marketplaceComparison = [
  "Commission fees",
  "Marketplace owns customer attention",
  "Delivery-first",
  "Harder to build direct relationship",
];

const saanaComparison = [
  "Flat monthly pricing",
  "Your restaurant, your phone line, your customers",
  "Pickup-order focused",
  "Built around missed-call recovery",
];

export default function PricingPage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: saanaColors.softBackground }}
    >
      <MarketingHeader />

      <section className="relative z-10 overflow-hidden border-b border-orange-100 bg-white/90">
        <FloatingPattern className="-right-28 top-10 w-[420px] opacity-[0.07] sm:opacity-[0.08] lg:w-[560px] lg:opacity-[0.10]" />
        <SectionShell className="relative z-10 pb-14 pt-12 sm:pb-20 sm:pt-16">
          <div className="mx-auto max-w-4xl text-center">
            <div
              className="inline-flex rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.12em]"
              style={{
                backgroundColor: saanaColors.softOrange,
                color: saanaColors.orange,
              }}
            >
              Founding restaurants lock in intro pricing.
            </div>

            <h1
              className="mt-6 text-5xl font-black leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl"
              style={{ color: saanaColors.navy }}
            >
              Simple restaurant technology pricing.
            </h1>

            <p
              className="mx-auto mt-6 max-w-3xl text-lg leading-8 sm:text-xl"
              style={{ color: saanaColors.muted }}
            >
              Start with missed-call recovery, then add website, menu, checkout,
              and SEO support when your restaurant is ready.
            </p>

            <div className="mt-8 flex justify-center">
              <TrustLine />
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <CTAButton href="/onboard">Book Your Setup</CTAButton>
              <CTAButton href="#website-package" variant="secondary">
                View Website Package
              </CTAButton>
            </div>
          </div>
        </SectionShell>
      </section>

      <SectionShell id="missed-call-recovery" className="relative z-10 overflow-hidden">
        <FloatingPattern className="-left-44 bottom-[-130px] hidden w-[430px] opacity-[0.06] lg:block" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <p
            className="text-sm font-black uppercase tracking-[0.14em]"
            style={{ color: saanaColors.orange }}
          >
            Missed Call Recovery
          </p>
          <h2
            className="mt-3 text-4xl font-black tracking-normal sm:text-5xl"
            style={{ color: saanaColors.navy }}
          >
            Recover missed calls with a dedicated phone line included.
          </h2>
          <p
            className="mt-4 text-lg leading-8"
            style={{ color: saanaColors.muted }}
          >
            Recover missed calls and send customers an SMS ordering link with a
            dedicated phone line included.
          </p>
        </div>

        <div className="relative z-10 mt-10 grid gap-5 lg:grid-cols-2">
          {missedCallPlans.map((plan) => (
            <MissedCallPlanCard key={plan.name} plan={plan} />
          ))}
        </div>
      </SectionShell>

      <SectionShell id="website-package" className="relative z-10 overflow-hidden bg-white/90">
        <FloatingPattern className="-right-40 top-14 hidden w-[430px] opacity-[0.07] lg:block" />
        <div className="relative z-10 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p
              className="text-sm font-black uppercase tracking-[0.14em]"
              style={{ color: saanaColors.orange }}
            >
              Separate product
            </p>
            <h2
              className="mt-3 text-4xl font-black tracking-normal sm:text-5xl"
              style={{ color: saanaColors.navy }}
            >
              Website + Menu + Checkout
            </h2>
            <p
              className="mt-4 text-lg leading-8"
              style={{ color: saanaColors.muted }}
            >
              A separate website package for restaurants that need a clean
              online presence and direct pickup checkout.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {websiteProducts.map((product) => (
              <WebsiteProductCard key={product.name} product={product} />
            ))}
          </div>
        </div>

        <div
          className="relative z-10 mt-8 rounded-3xl border bg-[#fffaf7] p-6 shadow-[0_18px_45px_rgba(7,30,65,0.08)]"
          style={{ borderColor: saanaColors.paleOrange }}
        >
          <h3
            className="text-2xl font-black"
            style={{ color: saanaColors.navy }}
          >
            SEO — Separate Product
          </h3>
          <p className="mt-3" style={{ color: saanaColors.muted }}>
            Need help getting found on Google? Ask about our restaurant SEO
            package.
          </p>
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden">
        <FloatingPattern className="-left-40 top-12 hidden w-[400px] opacity-[0.06] lg:block" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <p
            className="text-sm font-black uppercase tracking-[0.14em]"
            style={{ color: saanaColors.orange }}
          >
            Why SaanaOS
          </p>
          <h2
            className="mt-3 text-4xl font-black tracking-normal sm:text-5xl"
            style={{ color: saanaColors.navy }}
          >
            Built for direct restaurant relationships.
          </h2>
        </div>

        <div className="relative z-10 mt-10 grid gap-5 lg:grid-cols-2">
          <ComparisonCard
            title="Marketplace apps"
            items={marketplaceComparison}
            muted
          />
          <ComparisonCard title="SaanaOS" items={saanaComparison} />
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <FloatingPattern className="-right-36 bottom-[-120px] hidden w-[430px] opacity-[0.07] lg:block" />
        <div
          className="relative z-10 overflow-hidden rounded-3xl border p-8 shadow-[0_24px_70px_rgba(7,30,65,0.12)] sm:p-10"
          style={{
            backgroundColor: saanaColors.softBackground,
            borderColor: saanaColors.paleOrange,
          }}
        >
          <div className="relative max-w-2xl">
            <h2
              className="text-4xl font-black tracking-normal sm:text-5xl"
              style={{ color: saanaColors.navy }}
            >
              Ready to recover missed orders?
            </h2>
            <p className="mt-4 text-lg" style={{ color: saanaColors.muted }}>
              Start with missed-call recovery, then add the website package when
              your restaurant is ready.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <CTAButton href="/onboard">Book Your Setup</CTAButton>
              <CTAButton href="#website-package" variant="secondary">
                View Website Package
              </CTAButton>
            </div>
          </div>
        </div>
      </SectionShell>

      <div className="relative z-10">
        <MarketingFooter />
      </div>
    </main>
  );
}

function MissedCallPlanCard({
  plan,
}: {
  plan: {
    name: string;
    href: string;
    regularPrice: string;
    introPrice: string;
    bullets: string[];
  };
}) {
  return (
    <div
      className="rounded-3xl border bg-white p-7 shadow-[0_24px_70px_rgba(7,30,65,0.12)]"
      style={{ borderColor: saanaColors.paleOrange }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-2xl font-black" style={{ color: saanaColors.navy }}>
          {plan.name}
        </h3>
        <span
          className="rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em]"
          style={{
            backgroundColor: saanaColors.softOrange,
            color: saanaColors.orange,
          }}
        >
          Intro Offer
        </span>
      </div>

      <div className="mt-6">
        <div
          className="text-lg font-bold line-through"
          style={{ color: saanaColors.muted }}
        >
          {plan.regularPrice}
        </div>
        <div
          className="mt-1 text-5xl font-black"
          style={{ color: saanaColors.orange }}
        >
          {plan.introPrice}
        </div>
        <p className="mt-2 text-sm font-semibold" style={{ color: saanaColors.muted }}>
          Per location
        </p>
      </div>

      <div
        className="mt-6 rounded-2xl px-4 py-3 text-sm font-black"
        style={{
          backgroundColor: saanaColors.softOrange,
          color: saanaColors.navy,
        }}
      >
        Dedicated phone line included
      </div>

      <ul className="mt-6 space-y-3">
        {plan.bullets.map((bullet) => (
          <li
            key={bullet}
            className="flex gap-3 text-sm font-medium"
            style={{ color: saanaColors.ink }}
          >
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: saanaColors.orange }}
            />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <div className="mt-7">
        <CTAButton href={plan.href} className="w-full">
          Book Your Setup
        </CTAButton>
      </div>
    </div>
  );
}

function WebsiteProductCard({
  product,
}: {
  product: {
    name: string;
    price: string;
    note: string;
    bullets: string[];
  };
}) {
  return (
    <div
      className="rounded-3xl border bg-white p-6 shadow-[0_18px_45px_rgba(7,30,65,0.08)]"
      style={{ borderColor: saanaColors.border }}
    >
      <h3 className="text-xl font-black" style={{ color: saanaColors.navy }}>
        {product.name}
      </h3>
      <p
        className="mt-4 text-4xl font-black"
        style={{ color: saanaColors.orange }}
      >
        {product.price}
      </p>
      <p className="mt-2 text-sm font-semibold" style={{ color: saanaColors.muted }}>
        {product.note}
      </p>

      <ul className="mt-6 space-y-3">
        {product.bullets.map((bullet) => (
          <li
            key={bullet}
            className="flex gap-3 text-sm font-medium"
            style={{ color: saanaColors.ink }}
          >
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: saanaColors.orange }}
            />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonCard({
  title,
  items,
  muted = false,
}: {
  title: string;
  items: string[];
  muted?: boolean;
}) {
  return (
    <div
      className="rounded-3xl border bg-white p-7 shadow-[0_18px_45px_rgba(7,30,65,0.08)]"
      style={{
        borderColor: muted ? saanaColors.border : saanaColors.paleOrange,
      }}
    >
      <h3 className="text-2xl font-black" style={{ color: saanaColors.navy }}>
        {title}
      </h3>
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3 text-sm font-medium"
            style={{ color: muted ? saanaColors.muted : saanaColors.ink }}
          >
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: muted
                  ? saanaColors.border
                  : saanaColors.orange,
              }}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
