import type { Metadata } from "next";

import { FloatingPattern } from "@/components/brand/FloatingPattern";
import { CTAButton } from "@/components/marketing/CTAButton";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { SectionShell } from "@/components/marketing/SectionShell";
import { TrustLine } from "@/components/marketing/TrustLine";
import { saanaColors } from "@/lib/brand/colors";

export const metadata: Metadata = {
  title: "SMS Ordering System for Restaurants | SaanaOS",
  description:
    "Enable SMS ordering for your restaurant. Send customers simple ordering links by text, recover missed calls, and keep direct pickup orders off marketplaces.",
};

const steps = [
  "Customer calls or requests ordering help",
  "Consent is captured before messaging",
  "SaanaOS sends a simple pickup ordering link",
  "The customer places a direct order",
];

const benefits = [
  {
    title: "Fast customer follow-up",
    body: "Give callers a direct next step instead of leaving them on hold or losing them after a missed call.",
  },
  {
    title: "Direct pickup orders",
    body: "Route customers back to your own restaurant ordering flow.",
  },
  {
    title: "Dedicated phone line",
    body: "Missed-call recovery plans include a dedicated phone line for the restaurant.",
  },
  {
    title: "No marketplace commission",
    body: "Keep the relationship direct and avoid handing customer attention to marketplace apps.",
  },
];

export default function SmsOrderingForRestaurantsPage() {
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
              SMS ordering for restaurants
            </p>
            <h1
              className="mt-6 text-5xl font-black leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl"
              style={{ color: saanaColors.navy }}
            >
              SMS ordering for restaurants that keeps customers direct.
            </h1>
            <p
              className="mt-6 max-w-3xl text-lg leading-8 sm:text-xl"
              style={{ color: saanaColors.muted }}
            >
              Send customers a simple ordering link by text so they can place
              pickup orders from your restaurant, not a marketplace.
            </p>
            <div className="mt-7">
              <TrustLine />
            </div>
            <div className="mt-8">
              <CTAButton href="/onboard">Book Your Setup</CTAButton>
            </div>
          </div>
        </SectionShell>
      </section>

      <SectionShell className="relative z-10 overflow-hidden">
        <FloatingPattern className="-right-44 top-8 hidden w-[420px] opacity-[0.07] lg:block" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
              Text should support the customer relationship, not replace it.
            </h2>
            <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
              SMS ordering works best when it is direct, consent-based, and tied to
              the restaurant&apos;s own ordering flow. SaanaOS uses text as a recovery
              path for customers who already tried to reach you.
            </p>
          </div>
          <div className="rounded-3xl border bg-white p-6 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
            <p className="text-sm font-black uppercase tracking-[0.14em]" style={{ color: saanaColors.orange }}>
              Consent-first messaging
            </p>
            <p className="mt-3 text-2xl font-black" style={{ color: saanaColors.navy }}>
              SMS order links are sent after customer consent.
            </p>
            <p className="mt-3" style={{ color: saanaColors.muted }}>
              SaanaOS is designed around direct restaurant relationships and
              consent-aware customer follow-up.
            </p>
          </div>
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <FloatingPattern className="-left-44 bottom-[-120px] hidden w-[430px] opacity-[0.06] lg:block" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
            How SMS ordering works
          </h2>
          <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
            The flow is simple: customer intent comes in, consent is respected, and
            the ordering link keeps the pickup order direct.
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
            Benefits of SMS ordering
          </h2>
        </div>
        <div className="relative z-10 mt-10 grid gap-5 md:grid-cols-2">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="rounded-[32px] border bg-white p-7 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
              <h3 className="text-2xl font-black" style={{ color: saanaColors.navy }}>
                {benefit.title}
              </h3>
              <p className="mt-3 leading-7" style={{ color: saanaColors.muted }}>
                {benefit.body}
              </p>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <FloatingPattern className="-left-40 top-12 hidden w-[400px] opacity-[0.06] lg:block" />
        <div className="relative z-10 rounded-[32px] border bg-[#fffaf7] p-8 shadow-[0_24px_70px_rgba(7,30,65,0.10)] sm:p-10">
          <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
            Start turning missed calls into direct pickup orders.
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8" style={{ color: saanaColors.muted }}>
            Book your setup and use SMS ordering as a direct recovery path for
            restaurant customers.
          </p>
          <div className="mt-8">
            <CTAButton href="/onboard">Book Your Setup</CTAButton>
          </div>
        </div>
      </SectionShell>

      <MarketingFooter />
    </main>
  );
}
