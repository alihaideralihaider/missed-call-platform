import type { Metadata } from "next";

import { FloatingPattern } from "@/components/brand/FloatingPattern";
import { CTAButton } from "@/components/marketing/CTAButton";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { SectionShell } from "@/components/marketing/SectionShell";
import { TrustLine } from "@/components/marketing/TrustLine";
import { saanaColors } from "@/lib/brand/colors";

export const metadata: Metadata = {
  title: "Restaurant Missed Call Recovery Deal Room | SaanaOS",
  description:
    "Understand SaanaOS missed-call recovery for restaurants, including consent-aware SMS links, bounded follow-up, direct pickup ordering, setup, pricing, calculators, and technical proof.",
};

const problemPoints = [
  "Restaurants miss calls during rush hours, after hours, or when staff is busy.",
  "Missed calls can become missed direct orders.",
  "Customers often move on if nobody answers.",
  "Marketplaces take commission when customers do not order direct.",
];

const productPoints = [
  "Dedicated restaurant number",
  "Missed-call recovery flow",
  "SMS ordering link after required consent",
  "Direct pickup ordering page",
  "Bounded reminders",
  "Stop on order placed or expiration",
];

const flowSteps = [
  "Customer Calls",
  "Restaurant Misses Call",
  "SaanaOS Sends Order Link",
  "Customer Places Pickup Order",
  "Follow-Up Stops",
  "Restaurant Gets Direct Order",
];

const setupNeeds = [
  "Restaurant name",
  "Phone/contact person",
  "Menu/items/prices",
  "Pickup instructions",
  "Logo/photos if available",
  "Business hours",
  "Preferred dedicated number setup",
  "SMS consent wording/approval details if needed",
  "Stripe/billing/payment setup if applicable",
];

const customerExperience = [
  "Customer calls your restaurant.",
  "Customer hears or receives a consent-aware flow where applicable.",
  "Customer receives an ordering link.",
  "Customer can place a direct pickup order.",
  "Customer may receive a limited reminder if they do not order.",
  "Customer can opt out where required.",
];

const mysteryQrPoints = [
  "Restaurant prints one QR code for receipts, counter cards, takeout bags, menus, window decals, business cards, and catering flyers.",
  "Customer scans and enters their phone number to reveal a mystery offer.",
  "Consent is restaurant-specific.",
  "SaanaOS does not share or sell customer data to third parties.",
  "Offers are restaurant-approved.",
  "Offer window expires after 30 days.",
  "Expired scans can still send customers to normal ordering or catering.",
];

const complianceNotes = [
  "SMS consent matters.",
  "Transactional recovery and promotional texting are different.",
  "Promotional campaigns require separate consent.",
  "Opt-out must be respected.",
  "Messages should be bounded and not spammy.",
  "SaanaOS does not mean restaurants can upload a list and text everyone promotional offers without consent.",
];

const setupTimeline = [
  "Review restaurant info",
  "Configure ordering page and recovery flow",
  "Test call/SMS/order flow",
  "Go live and monitor recovered orders",
];

const faqs = [
  {
    question: "Will this replace my staff?",
    answer:
      "No. SaanaOS supports the moments when staff cannot answer. The goal is to recover direct ordering opportunities, not remove human service.",
  },
  {
    question: "What if a customer already ordered?",
    answer:
      "The recovery loop should stop when an order is placed. Bounded attempts are designed to avoid unnecessary follow-up.",
  },
  {
    question: "What if the customer ignores the link?",
    answer:
      "The recovery job can send limited reminders, then expires. There is no unlimited follow-up.",
  },
  {
    question: "Can I send promos to all my customers?",
    answer:
      "No. Promotional texting requires proper consent. Missed-call recovery and promotional campaigns are different use cases.",
  },
  {
    question: "Does this work for pickup only?",
    answer:
      "The current SaanaOS flow is focused on direct pickup ordering.",
  },
  {
    question: "Do I need to rebuild my website?",
    answer:
      "No. SaanaOS can start with missed-call recovery and a direct ordering page. A fuller website package can be added when needed.",
  },
  {
    question: "How long does setup take?",
    answer:
      "Setup depends on menu readiness, phone setup, payment setup, and testing. The basic path is review, configure, test, then go live.",
  },
  {
    question: "What if I already use Toast/Clover/Square?",
    answer:
      "You can still review whether SaanaOS fits your direct pickup workflow. POS integrations are not promised unless they are explicitly built and supported.",
  },
  {
    question: "What does the restaurant need to do every day?",
    answer:
      "Monitor incoming orders, keep menu and pickup details accurate, and review recovered order activity.",
  },
  {
    question: "Is revenue guaranteed?",
    answer:
      "No. Results depend on call volume, customer intent, menu, hours, consent, SMS deliverability, and ordering experience.",
  },
];

export default function RestaurantMissedCallRecoveryDealRoomPage() {
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
              Buyer Deal Room
            </p>
            <h1
              className="mt-6 text-5xl font-black leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl"
              style={{ color: saanaColors.navy }}
            >
              Everything you need to understand SaanaOS missed-call recovery.
            </h1>
            <p
              className="mx-auto mt-6 max-w-3xl text-lg leading-8 sm:text-xl"
              style={{ color: saanaColors.muted }}
            >
              See how SaanaOS helps restaurants turn missed calls into direct
              pickup order opportunities using consent-aware SMS links, bounded
              follow-up, and direct ordering.
            </p>
            <div className="mt-7 flex justify-center">
              <TrustLine />
            </div>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <CTAButton href="/pricing">Start founding pricing</CTAButton>
              <CTAButton href="/missed-call-revenue-calculator" variant="secondary">
                Estimate missed-call revenue
              </CTAButton>
              <CTAButton
                href="mailto:navid@authtoolkit.com?subject=SaanaOS%20Missed%20Call%20Recovery%20Setup"
                variant="secondary"
              >
                Request setup
              </CTAButton>
            </div>
          </div>
        </SectionShell>
      </section>

      <SectionShell className="relative z-10 overflow-hidden">
        <FloatingPattern className="-left-44 bottom-[-120px] hidden w-[430px] opacity-[0.06] lg:block" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-2">
          <InfoCard title="The problem" items={problemPoints} />
          <InfoCard title="What SaanaOS does" items={productPoints} highlighted />
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <FloatingPattern className="-right-40 top-12 hidden w-[430px] opacity-[0.07] lg:block" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
            Recovery flow
          </h2>
          <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
            If no order happens, the recovery job expires after bounded attempts.
            No unlimited follow-up.
          </p>
        </div>
        <div className="relative z-10 mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {flowSteps.map((step, index) => (
            <FlowCard key={step} step={step} index={index} />
          ))}
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden">
        <div className="relative z-10 grid gap-6 lg:grid-cols-2">
          <ChecklistCard title="What the restaurant needs to provide" items={setupNeeds} />
          <ChecklistCard title="What the customer experiences" items={customerExperience} />
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <FloatingPattern className="-right-40 top-12 hidden w-[430px] opacity-[0.07] lg:block" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p
              className="inline-flex rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.12em]"
              style={{
                backgroundColor: saanaColors.softOrange,
                color: saanaColors.orange,
              }}
            >
              Mystery QR Offers
            </p>
            <h2 className="mt-4 text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
              Turn printed materials into direct pickup order paths.
            </h2>
            <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
              Turn receipts, counter cards, takeout bags, menus, window decals,
              business cards, and catering flyers into direct pickup orders.
            </p>
            <p
              className="mt-5 rounded-2xl px-4 py-3 text-sm font-black leading-6"
              style={{
                backgroundColor: saanaColors.softOrange,
                color: saanaColors.navy,
              }}
            >
              You approve the offers. SaanaOS decides when to show them.
            </p>
            <p className="mt-4 text-sm font-semibold leading-6" style={{ color: saanaColors.muted }}>
              Phase 1 does not auto-apply checkout discounts or provide actual
              QR revenue tracking yet. Revenue should be discussed as estimated
              or potential until redemption tracking is implemented.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <CTAButton href="/mystery-qr-revenue-calculator">
                Estimate Mystery QR revenue
              </CTAButton>
              <CTAButton href="/pricing" variant="secondary">
                Add to pickup flow
              </CTAButton>
            </div>
          </div>
          <ChecklistCard title="How Mystery QR works" items={mysteryQrPoints} compact />
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <FloatingPattern className="-left-40 top-12 hidden w-[400px] opacity-[0.06] lg:block" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
              Compliance and consent notes
            </h2>
            <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
              This is practical operating guidance, not legal advice. Restaurants
              should review their own messaging practices and consent language.
            </p>
          </div>
          <ChecklistCard title="Practical rules" items={complianceNotes} compact />
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden">
        <div className="relative z-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[32px] border bg-white p-7 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
            <h2 className="text-3xl font-black" style={{ color: saanaColors.navy }}>
              Pricing and setup
            </h2>
            <p className="mt-4 leading-7" style={{ color: saanaColors.muted }}>
              Founding pricing exists on the pricing page. Setup may include a
              menu/direct ordering page. Dedicated line and usage may apply
              depending on plan. Direct pickup orders do not carry marketplace
              commission.
            </p>
            <div className="mt-7">
              <CTAButton href="/pricing">View pricing</CTAButton>
            </div>
          </div>
          <div className="rounded-[32px] border bg-white p-7 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
            <h2 className="text-3xl font-black" style={{ color: saanaColors.navy }}>
              Proof / technical trust
            </h2>
            <p className="mt-4 leading-7" style={{ color: saanaColors.muted }}>
              The Universal Attempts Engine powers bounded recovery attempts
              and stops when an order is placed or the job expires.
            </p>
            <p className="mt-4 text-sm font-bold leading-6" style={{ color: saanaColors.muted }}>
              Technical proof for operators and partners who want to understand
              how the recovery loop works.
            </p>
            <div className="mt-7">
              <CTAButton href="/attempts-engine" variant="secondary">
                View technical proof
              </CTAButton>
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
            Estimate the opportunity before setup
          </h2>
          <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
            Use calculators to estimate opportunity before setup. These are
            educational estimates, not guarantees.
          </p>
        </div>
        <div className="relative z-10 mt-10 grid gap-5 lg:grid-cols-2">
          <CalculatorCard
            title="Missed Call Revenue Calculator"
            description="Estimate how much direct-order revenue your restaurant may be losing when calls go unanswered."
            href="/missed-call-revenue-calculator"
            cta="Estimate missed-call revenue"
          />
          <CalculatorCard
            title="Aggregator Fee Savings Calculator"
            description="Estimate how much commission your restaurant may save by shifting more pickup orders direct."
            href="/aggregator-fee-savings-calculator"
            cta="Estimate fee savings"
          />
          <CalculatorCard
            title="Mystery QR Revenue Estimate Calculator"
            description="Estimate how much direct pickup revenue receipt stickers, counter cards, takeout bags, and catering flyers could influence."
            href="/mystery-qr-revenue-calculator"
            cta="Estimate Mystery QR revenue"
          />
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden">
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
            FAQ
          </h2>
        </div>
        <div className="relative z-10 mx-auto mt-10 grid max-w-4xl gap-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="rounded-3xl border bg-white p-5 shadow-[0_12px_30px_rgba(7,30,65,0.06)]"
              style={{ borderColor: saanaColors.border }}
            >
              <summary className="cursor-pointer text-lg font-black" style={{ color: saanaColors.navy }}>
                {faq.question}
              </summary>
              <p className="mt-3 leading-7" style={{ color: saanaColors.muted }}>
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <FloatingPattern className="-right-44 bottom-[-140px] hidden w-[430px] opacity-[0.06] lg:block" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
              Setup timeline
            </h2>
            <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
              A simple setup path keeps the recovery loop understandable before
              launch.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {setupTimeline.map((step, index) => (
              <FlowCard key={step} step={step} index={index} />
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden">
        <div className="relative z-10 rounded-[32px] border bg-white p-8 shadow-[0_24px_70px_rgba(7,30,65,0.10)] sm:p-10">
          <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
            Ready to recover more direct pickup orders?
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8" style={{ color: saanaColors.muted }}>
            Review pricing, request setup, or estimate missed-call revenue
            before moving forward.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CTAButton href="/pricing">Start founding pricing</CTAButton>
            <CTAButton
              href="mailto:navid@authtoolkit.com?subject=SaanaOS%20Missed%20Call%20Recovery%20Setup"
              variant="secondary"
            >
              Request setup
            </CTAButton>
            <CTAButton href="/missed-call-revenue-calculator" variant="secondary">
              Estimate missed-call revenue
            </CTAButton>
          </div>
        </div>
      </SectionShell>

      <MarketingFooter />
    </main>
  );
}

function InfoCard({
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
      className="rounded-[32px] border bg-white p-7 shadow-[0_18px_45px_rgba(7,30,65,0.08)]"
      style={{
        backgroundColor: highlighted ? saanaColors.softOrange : "#FFFFFF",
        borderColor: highlighted ? saanaColors.paleOrange : saanaColors.border,
      }}
    >
      <h2 className="text-3xl font-black" style={{ color: saanaColors.navy }}>
        {title}
      </h2>
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm font-semibold leading-6" style={{ color: saanaColors.muted }}>
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: saanaColors.orange }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChecklistCard({
  title,
  items,
  compact = false,
}: {
  title: string;
  items: string[];
  compact?: boolean;
}) {
  return (
    <div className="rounded-[32px] border bg-white p-7 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
      <h2 className="text-3xl font-black" style={{ color: saanaColors.navy }}>
        {title}
      </h2>
      <ul className={["mt-6 grid gap-3", compact ? "" : "sm:grid-cols-2"].join(" ")}>
        {items.map((item) => (
          <li
            key={item}
            className="rounded-2xl border px-4 py-3 text-sm font-bold"
            style={{
              backgroundColor: saanaColors.softBackground,
              borderColor: saanaColors.border,
              color: saanaColors.navy,
            }}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FlowCard({ step, index }: { step: string; index: number }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
      <div
        className="grid h-11 w-11 place-items-center rounded-2xl text-base font-black text-white"
        style={{ backgroundColor: index % 3 === 2 ? saanaColors.orange : saanaColors.navy }}
      >
        {index + 1}
      </div>
      <h3 className="mt-4 text-lg font-black" style={{ color: saanaColors.navy }}>
        {step}
      </h3>
    </div>
  );
}

function CalculatorCard({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-[32px] border bg-white p-7 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
      <h3 className="text-2xl font-black" style={{ color: saanaColors.navy }}>
        {title}
      </h3>
      <p className="mt-4 leading-7" style={{ color: saanaColors.muted }}>
        {description}
      </p>
      <div className="mt-7">
        <CTAButton href={href} variant="secondary">
          {cta}
        </CTAButton>
      </div>
    </div>
  );
}
