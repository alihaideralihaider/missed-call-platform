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
    "How SaanaOS Works | Restaurant Missed Call Recovery & SMS Ordering",
  description:
    "Learn how SaanaOS helps restaurants recover missed calls and turn them into direct pickup orders using SMS ordering links and dedicated phone lines.",
};

const steps = [
  {
    title: "Customer calls your restaurant",
    body: "Buying intent starts on your restaurant phone line.",
  },
  {
    title: "Missed-call recovery starts",
    body: "SaanaOS detects that the call was missed or could not be answered.",
  },
  {
    title: "SMS order link is sent after consent",
    body: "The customer gets a simple direct ordering path by text.",
  },
  {
    title: "Pickup order appears in your dashboard",
    body: "Your team receives the order and can prepare it for pickup.",
  },
];

const notes = [
  {
    title: "Phone line included",
    body: "Missed-call recovery plans include a dedicated phone line so setup stays simple per location.",
  },
  {
    title: saanaBrandCopy.websiteProductLine,
    body: "Need a restaurant website too? Website, menu, checkout, hosting, maintenance, and SEO are handled as separate products.",
  },
];

export default function HowItWorksPage() {
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
              Restaurant technology, simplified
            </p>
            <h1
              className="mt-6 text-5xl font-black leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl"
              style={{ color: saanaColors.navy }}
            >
              How SaanaOS works
            </h1>
            <p
              className="mt-6 max-w-3xl text-lg leading-8 sm:text-xl"
              style={{ color: saanaColors.muted }}
            >
              From missed call to SMS link to pickup order, SaanaOS keeps the
              customer relationship with your restaurant.
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
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
            Call missed. Order recovered.
          </h2>
          <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
            The product is built around one direct loop for restaurants.
          </p>
        </div>
        <div className="relative z-10 mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-3xl border bg-white p-6 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
              <div className="grid h-12 w-12 place-items-center rounded-2xl text-lg font-black text-white" style={{ backgroundColor: index === 2 ? saanaColors.orange : saanaColors.navy }}>
                {index + 1}
              </div>
              <h3 className="mt-5 text-xl font-black" style={{ color: saanaColors.navy }}>
                {step.title}
              </h3>
              <p className="mt-3 leading-7" style={{ color: saanaColors.muted }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <FloatingPattern className="-left-44 bottom-[-120px] hidden w-[430px] opacity-[0.06] lg:block" />
        <div className="relative z-10 grid gap-5 lg:grid-cols-2">
          {notes.map((note) => (
            <div key={note.title} className="rounded-[32px] border bg-white p-7 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
              <h2 className="text-3xl font-black" style={{ color: saanaColors.navy }}>
                {note.title}
              </h2>
              <p className="mt-4 leading-7" style={{ color: saanaColors.muted }}>
                {note.body}
              </p>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden">
        <FloatingPattern className="-right-40 top-14 hidden w-[430px] opacity-[0.07] lg:block" />
        <div className="relative z-10 rounded-[32px] border bg-[#fffaf7] p-8 shadow-[0_24px_70px_rgba(7,30,65,0.10)] sm:p-10">
          <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
            Start recovering missed restaurant orders with SaanaOS.
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8" style={{ color: saanaColors.muted }}>
            Your restaurant. Your phone line. Your customers.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CTAButton href="/onboard">Book Your Setup</CTAButton>
            <CTAButton href="/pricing" variant="secondary">
              See Pricing
            </CTAButton>
          </div>
        </div>
      </SectionShell>

      <MarketingFooter />
    </main>
  );
}
