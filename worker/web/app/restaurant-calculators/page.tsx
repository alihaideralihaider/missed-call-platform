import type { Metadata } from "next";

import { FloatingPattern } from "@/components/brand/FloatingPattern";
import { CTAButton } from "@/components/marketing/CTAButton";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { SectionShell } from "@/components/marketing/SectionShell";
import { TrustLine } from "@/components/marketing/TrustLine";
import { saanaColors } from "@/lib/brand/colors";

export const metadata: Metadata = {
  title: "Restaurant Revenue Calculators | SaanaOS",
  description:
    "Use SaanaOS restaurant calculators to estimate missed-call revenue opportunity and aggregator fee savings. Educational estimates, not guarantees.",
};

const liveCalculators = [
  {
    title: "Missed Call Revenue Calculator",
    description:
      "Estimate how much direct-order revenue your restaurant may be losing when calls go unanswered.",
    href: "/missed-call-revenue-calculator",
    cta: "Calculate missed-call revenue",
  },
  {
    title: "Aggregator Fee Savings Calculator",
    description:
      "Estimate how much commission your restaurant may save by shifting more pickup orders to direct ordering.",
    href: "/aggregator-fee-savings-calculator",
    cta: "Calculate fee savings",
  },
];

const futureCalculators = [
  "Direct Ordering Profit Calculator",
  "SMS Consent Readiness Checker",
];

const helperPoints = [
  "Quantify hidden revenue leakage",
  "Understand direct-order opportunity",
  "Compare marketplace commission impact",
  "Prepare for a setup or pricing conversation",
  "Learn without committing to anything",
];

export default function RestaurantCalculatorsPage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: saanaColors.softBackground }}
    >
      <MarketingHeader />

      <section className="relative z-10 overflow-hidden border-b border-orange-100 bg-white/90">
        <FloatingPattern className="-right-28 top-12 w-[420px] opacity-[0.07] sm:opacity-[0.08] lg:w-[560px] lg:opacity-[0.10]" />
        <SectionShell className="relative z-10 pb-14 pt-12 sm:pb-20 sm:pt-16">
          <div className="mx-auto max-w-4xl text-center">
            <p
              className="inline-flex rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.12em]"
              style={{
                backgroundColor: saanaColors.softOrange,
                color: saanaColors.orange,
              }}
            >
              Restaurant Revenue Calculators
            </p>
            <h1
              className="mt-6 text-5xl font-black leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl"
              style={{ color: saanaColors.navy }}
            >
              Estimate where your restaurant may be losing direct-order revenue.
            </h1>
            <p
              className="mx-auto mt-6 max-w-3xl text-lg leading-8 sm:text-xl"
              style={{ color: saanaColors.muted }}
            >
              Use these calculators to understand missed-call order opportunity,
              marketplace fee savings, and future direct-order growth paths.
              These are educational estimates, not guarantees.
            </p>
            <div className="mt-7 flex justify-center">
              <TrustLine />
            </div>
          </div>
        </SectionShell>
      </section>

      <SectionShell className="relative z-10 overflow-hidden">
        <FloatingPattern className="-left-44 bottom-[-120px] hidden w-[430px] opacity-[0.06] lg:block" />
        <div className="relative z-10 grid gap-5 lg:grid-cols-2">
          {liveCalculators.map((calculator) => (
            <CalculatorCard key={calculator.title} calculator={calculator} />
          ))}
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <FloatingPattern className="-right-40 top-12 hidden w-[430px] opacity-[0.07] lg:block" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <h2
              className="text-4xl font-black sm:text-5xl"
              style={{ color: saanaColors.navy }}
            >
              How these calculators help
            </h2>
            <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
              The calculators are planning tools. They help restaurant owners
              ask better questions before choosing pricing, setup, or direct
              ordering workflows.
            </p>
          </div>
          <div className="grid gap-3">
            {helperPoints.map((point) => (
              <div
                key={point}
                className="flex gap-3 rounded-2xl border bg-white px-4 py-3 text-sm font-bold shadow-sm"
                style={{ borderColor: saanaColors.border, color: saanaColors.navy }}
              >
                <span
                  className="mt-2 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: saanaColors.orange }}
                />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden">
        <div className="relative z-10 rounded-[32px] border bg-white p-8 shadow-[0_18px_45px_rgba(7,30,65,0.08)] sm:p-10">
          <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
            Coming later
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8" style={{ color: saanaColors.muted }}>
            These are future calculator ideas, not live tools yet.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {futureCalculators.map((calculator) => (
              <div
                key={calculator}
                className="rounded-3xl border p-5"
                style={{
                  backgroundColor: saanaColors.softBackground,
                  borderColor: saanaColors.border,
                }}
              >
                <h3 className="text-xl font-black" style={{ color: saanaColors.navy }}>
                  {calculator}
                </h3>
                <p className="mt-3 text-sm font-semibold" style={{ color: saanaColors.muted }}>
                  Future calculator idea.
                </p>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <div className="relative z-10 rounded-[32px] border bg-white p-8 shadow-[0_24px_70px_rgba(7,30,65,0.10)] sm:p-10">
          <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
            Ready to compare options?
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8" style={{ color: saanaColors.muted }}>
            Use the calculators, then review founding pricing or the missed-call
            recovery flow.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CTAButton href="/pricing">Start founding pricing</CTAButton>
            <CTAButton href="/restaurant-missed-call-recovery" variant="secondary">
              Learn missed-call recovery
            </CTAButton>
            <CTAButton href="/restaurant-missed-call-recovery-deal-room" variant="secondary">
              View Deal Room
            </CTAButton>
            <CTAButton href="/attempts-engine" variant="secondary">
              Technical proof
            </CTAButton>
          </div>
        </div>
      </SectionShell>

      <MarketingFooter />
    </main>
  );
}

function CalculatorCard({
  calculator,
}: {
  calculator: {
    title: string;
    description: string;
    href: string;
    cta: string;
  };
}) {
  return (
    <article className="rounded-[32px] border bg-white p-7 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
      <h2 className="text-3xl font-black" style={{ color: saanaColors.navy }}>
        {calculator.title}
      </h2>
      <p className="mt-4 text-base leading-7" style={{ color: saanaColors.muted }}>
        {calculator.description}
      </p>
      <div className="mt-7">
        <CTAButton href={calculator.href}>{calculator.cta}</CTAButton>
      </div>
    </article>
  );
}
