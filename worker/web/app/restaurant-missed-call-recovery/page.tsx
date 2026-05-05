import type { Metadata } from "next";

import { FloatingPattern } from "@/components/brand/FloatingPattern";
import { CTAButton } from "@/components/marketing/CTAButton";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { SectionShell } from "@/components/marketing/SectionShell";
import { TrustLine } from "@/components/marketing/TrustLine";
import { saanaColors } from "@/lib/brand/colors";
import { saanaBrandCopy } from "@/lib/brand/copy";

export const metadata: Metadata = {
  title:
    "Restaurant Missed Call Recovery | Turn Missed Calls into Orders with SaanaOS",
  description:
    "Recover lost restaurant orders from missed calls with SaanaOS. Send SMS ordering links, use dedicated phone lines, and turn missed calls into direct pickup orders.",
};

const steps = [
  "Customer calls your restaurant",
  "Missed-call recovery starts",
  "SMS order link is sent after consent",
  "Pickup order appears in your dashboard",
];

const pricingPlans = [
  {
    name: "Basic",
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

const marketplace = [
  "Commission fees",
  "Marketplace owns customer attention",
  "Delivery-first ordering",
  "Harder to build a direct customer relationship",
];

const saana = [
  "Flat monthly pricing",
  "Your restaurant, your phone line, your customers",
  "Pickup-order focused",
  "Built around missed-call recovery",
];

export default function RestaurantMissedCallRecoveryPage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: saanaColors.softBackground }}
    >
      <MarketingHeader />

      <section className="relative z-10 overflow-hidden border-b border-orange-100 bg-white/90">
        <FloatingPattern className="-right-28 top-12 w-[420px] opacity-[0.07] sm:opacity-[0.08] lg:w-[560px] lg:opacity-[0.10]" />
        <SectionShell className="relative z-10 pb-14 pt-12 sm:pb-20 sm:pt-16">
          <div className="max-w-4xl">
            <p
              className="inline-flex rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.12em]"
              style={{
                backgroundColor: saanaColors.softOrange,
                color: saanaColors.orange,
              }}
            >
              Restaurant missed-call recovery
            </p>
            <h1
              className="mt-6 text-5xl font-black leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl"
              style={{ color: saanaColors.navy }}
            >
              Restaurant missed-call recovery that turns calls into pickup orders.
            </h1>
            <p
              className="mt-6 max-w-3xl text-lg leading-8 sm:text-xl"
              style={{ color: saanaColors.muted }}
            >
              SaanaOS helps restaurants recover missed calls with SMS ordering
              links, dedicated phone lines, and direct pickup ordering.
            </p>
            <div className="mt-7">
              <TrustLine />
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CTAButton href="/onboard">Book Your Setup</CTAButton>
              <CTAButton href="/pricing" variant="secondary">
                See Pricing
              </CTAButton>
              <CTAButton href="/missed-call-revenue-calculator" variant="secondary">
                Estimate missed-call revenue
              </CTAButton>
            </div>
          </div>
        </SectionShell>
      </section>

      <SectionShell className="relative z-10 overflow-hidden">
        <FloatingPattern className="-right-44 top-8 hidden w-[420px] opacity-[0.07] lg:block" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <h2
              className="text-4xl font-black tracking-normal sm:text-5xl"
              style={{ color: saanaColors.navy }}
            >
              {saanaBrandCopy.missedCallsLine}
            </h2>
            <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
              During rush hours, after hours, or while staff are serving guests,
              restaurants miss calls from customers who are ready to order. When
              those callers cannot get through, they often move to another option.
            </p>
          </div>
          <div className="rounded-3xl border bg-white p-6 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
            <p className="text-sm font-black uppercase tracking-[0.14em]" style={{ color: saanaColors.orange }}>
              Recovery focus
            </p>
            <p className="mt-3 text-2xl font-black" style={{ color: saanaColors.navy }}>
              Recover demand from customers who already called you.
            </p>
            <p className="mt-3" style={{ color: saanaColors.muted }}>
              SaanaOS keeps the recovery loop direct: phone line, consent, SMS
              link, pickup order, dashboard.
            </p>
          </div>
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <FloatingPattern className="-left-44 bottom-[-120px] hidden w-[430px] opacity-[0.06] lg:block" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
            How missed-call recovery works
          </h2>
          <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
            SaanaOS follows a simple flow that protects direct pickup orders without
            replacing your full restaurant stack.
          </p>
        </div>
        <div className="relative z-10 mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step} className="rounded-3xl border bg-white p-6 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
              <div className="grid h-12 w-12 place-items-center rounded-2xl text-lg font-black text-white" style={{ backgroundColor: index === 2 ? saanaColors.orange : saanaColors.navy }}>
                {index + 1}
              </div>
              <h3 className="mt-5 text-lg font-black" style={{ color: saanaColors.navy }}>
                {step}
              </h3>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden">
        <FloatingPattern className="-right-40 top-14 hidden w-[430px] opacity-[0.07] lg:block" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
            Simple pricing. Per location.
          </h2>
          <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
            Dedicated phone line included in both missed-call recovery plans.
          </p>
        </div>
        <div className="relative z-10 mt-10 grid gap-5 lg:grid-cols-2">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <FloatingPattern className="-left-40 top-12 hidden w-[400px] opacity-[0.06] lg:block" />
        <div className="relative z-10 grid gap-5 lg:grid-cols-2">
          <ComparisonCard title="Marketplace apps" items={marketplace} />
          <ComparisonCard title="SaanaOS" items={saana} highlighted />
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden">
        <FloatingPattern className="-right-44 bottom-[-140px] hidden w-[430px] opacity-[0.06] lg:block" />
        <div className="relative z-10 rounded-[32px] border bg-white p-8 shadow-[0_24px_70px_rgba(7,30,65,0.10)] sm:p-10">
          <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
            Start recovering missed restaurant orders with SaanaOS.
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8" style={{ color: saanaColors.muted }}>
            Founding restaurants lock in intro pricing.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CTAButton href="/onboard">Book Your Setup</CTAButton>
            <CTAButton href="/restaurant-missed-call-recovery-deal-room" variant="secondary">
              View Deal Room
            </CTAButton>
          </div>
        </div>
      </SectionShell>

      <MarketingFooter />
    </main>
  );
}

function PricingCard({
  plan,
}: {
  plan: { name: string; regularPrice: string; introPrice: string; bullets: string[] };
}) {
  return (
    <div className="rounded-[32px] border bg-white p-7 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-2xl font-black" style={{ color: saanaColors.navy }}>
          {plan.name}
        </h3>
        <span className="rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.1em]" style={{ backgroundColor: saanaColors.softOrange, color: saanaColors.orange }}>
          Intro Offer
        </span>
      </div>
      <div className="mt-6">
        <p className="text-sm line-through" style={{ color: saanaColors.muted }}>
          {plan.regularPrice}
        </p>
        <p className="text-5xl font-black" style={{ color: saanaColors.orange }}>
          {plan.introPrice}
        </p>
        <p className="mt-1 text-sm" style={{ color: saanaColors.muted }}>
          Per location
        </p>
      </div>
      <p className="mt-5 rounded-2xl px-4 py-3 text-sm font-bold" style={{ backgroundColor: saanaColors.softOrange, color: saanaColors.navy }}>
        Dedicated phone line included
      </p>
      <ul className="mt-6 space-y-3 text-sm" style={{ color: saanaColors.muted }}>
        {plan.bullets.map((bullet) => (
          <li key={bullet}>• {bullet}</li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonCard({
  title,
  items,
  highlighted = false,
}: {
  title: string;
  items: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className="rounded-[32px] border p-7 shadow-[0_18px_45px_rgba(7,30,65,0.08)]"
      style={{
        backgroundColor: highlighted ? saanaColors.softOrange : "#FFFFFF",
        borderColor: highlighted ? saanaColors.paleOrange : saanaColors.border,
      }}
    >
      <h3 className="text-2xl font-black" style={{ color: saanaColors.navy }}>
        {title}
      </h3>
      <ul className="mt-5 space-y-3" style={{ color: saanaColors.muted }}>
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}
