import type { Metadata } from "next";

import { FloatingPattern } from "@/components/brand/FloatingPattern";
import { CTAButton } from "@/components/marketing/CTAButton";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { SectionShell } from "@/components/marketing/SectionShell";
import { TrustLine } from "@/components/marketing/TrustLine";
import { saanaColors } from "@/lib/brand/colors";

export const metadata: Metadata = {
  title: "How to Increase Restaurant Orders | SaanaOS",
  description:
    "Learn how restaurants can increase direct orders, recover missed-call demand, send SMS ordering links, and reduce marketplace dependence with SaanaOS.",
};

const painPoints = [
  {
    title: "Missed rush-hour calls",
    body: "The busiest moments are often when phone calls are hardest to answer.",
  },
  {
    title: "After-hours demand",
    body: "Customers still call after the rush, after closing, or before staff can respond.",
  },
  {
    title: "Staff too busy to answer",
    body: "Your team may be serving guests, packing orders, or managing the kitchen.",
  },
];

const solutions = [
  {
    title: "Recover missed calls",
    body: "Turn phone demand into a follow-up path instead of losing the customer.",
  },
  {
    title: "Send SMS ordering links",
    body: "Give customers a simple way to place pickup orders directly.",
  },
  {
    title: "Protect direct relationships",
    body: "Keep the order and customer relationship with your restaurant.",
  },
];

const benefits = [
  "More direct pickup orders",
  "Less pressure on staff during peak hours",
  "Fewer customers lost to marketplaces",
  "A clearer view of missed-call demand",
];

export default function IncreaseRestaurantOrdersPage() {
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
              Increase restaurant orders
            </p>
            <h1
              className="mt-6 text-5xl font-black leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl"
              style={{ color: saanaColors.navy }}
            >
              Increase restaurant orders without handing customers to marketplaces.
            </h1>
            <p
              className="mt-6 max-w-3xl text-lg leading-8 sm:text-xl"
              style={{ color: saanaColors.muted }}
            >
              SaanaOS helps restaurants capture missed-call demand, send SMS
              ordering links, and grow direct pickup orders.
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
            Why restaurants lose orders
          </h2>
          <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
            Busy lines, missed calls, staffing pressure, and slow phone response
            push customers toward competitors and marketplace apps.
          </p>
        </div>
        <div className="relative z-10 mt-10 grid gap-5 md:grid-cols-3">
          {painPoints.map((point) => (
            <Card key={point.title} title={point.title} body={point.body} />
          ))}
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <FloatingPattern className="-left-44 bottom-[-120px] hidden w-[430px] opacity-[0.06] lg:block" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em]" style={{ color: saanaColors.orange }}>
              Direct order growth
            </p>
            <h2 className="mt-3 text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
              Capture demand that already exists.
            </h2>
            <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
              SaanaOS focuses on customers who already tried to call. The goal is
              not more complexity. It is a cleaner path from missed call to direct
              pickup order.
            </p>
          </div>
          <div className="grid gap-5">
            {solutions.map((solution) => (
              <Card key={solution.title} title={solution.title} body={solution.body} />
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden">
        <FloatingPattern className="-right-40 top-14 hidden w-[430px] opacity-[0.07] lg:block" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
            Direct ordering benefits
          </h2>
        </div>
        <div className="relative z-10 mt-10 grid gap-5 md:grid-cols-2">
          {benefits.map((benefit) => (
            <div key={benefit} className="rounded-[32px] border bg-white p-7 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
              <p className="text-xl font-black" style={{ color: saanaColors.navy }}>
                {benefit}
              </p>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <FloatingPattern className="-left-40 top-12 hidden w-[400px] opacity-[0.06] lg:block" />
        <div className="relative z-10 rounded-[32px] border bg-[#fffaf7] p-8 shadow-[0_24px_70px_rgba(7,30,65,0.10)] sm:p-10">
          <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
            Start increasing direct restaurant orders.
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8" style={{ color: saanaColors.muted }}>
            Recover missed calls and give customers a direct pickup ordering path.
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

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[32px] border bg-white p-7 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
      <h3 className="text-2xl font-black" style={{ color: saanaColors.navy }}>
        {title}
      </h3>
      <p className="mt-3 leading-7" style={{ color: saanaColors.muted }}>
        {body}
      </p>
    </div>
  );
}
