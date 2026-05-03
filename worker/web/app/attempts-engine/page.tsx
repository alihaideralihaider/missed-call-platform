import type { Metadata } from "next";

import { FloatingPattern } from "@/components/brand/FloatingPattern";
import { CTAButton } from "@/components/marketing/CTAButton";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { SectionShell } from "@/components/marketing/SectionShell";
import { saanaColors } from "@/lib/brand/colors";

export const metadata: Metadata = {
  title: "Universal Attempts Engine | SaanaOS",
  description:
    "The Universal Attempts Engine turns events into persistent recovery jobs, attempts, and measurable outcomes, starting with SaanaOS missed-call recovery.",
};

const futurePatterns = [
  "Missed Call Recovery",
  "Post-Checkout Revenue",
  "Post-Checkout Growth",
  "Lead Follow-Up",
];

const states = [
  {
    name: "active",
    body: "The job is still eligible for scheduled attempts.",
  },
  {
    name: "succeeded",
    body: "The desired outcome happened, such as an order being placed.",
  },
  {
    name: "expired",
    body: "The job reached its final attempt or expiry window.",
  },
  {
    name: "failed",
    body: "The job could not safely continue and needs review.",
  },
];

const audiences = [
  {
    title: "For restaurants",
    body: "Recover missed-call demand with a persistent, bounded follow-up loop that stops when an order is placed or the job expires.",
  },
  {
    title: "For developers",
    body: "Trace the workflow through attempt jobs, messages, events, Agent API runs, and action logs.",
  },
  {
    title: "For future agents",
    body: "Reuse the same event-to-outcome pattern for post-checkout, lead follow-up, reviews, referrals, and retention.",
  },
];

const docs = [
  "docs/attempts-engine/overview.md",
  "docs/attempts-engine/architecture.md",
  "docs/attempts-engine/execution-flow.md",
  "docs/attempts-engine/database-schema.md",
  "docs/attempts-engine/testing-guide.md",
  "docs/attempts-engine/troubleshooting.md",
  "docs/attempts-engine/customer-sop.md",
  "docs/attempts-engine/developer-quickstart.md",
  "docs/attempts-engine/webhook-and-batch-policy.md",
];

const diagramSteps = [
  {
    title: "External Event",
    body: "missed_call, checkout_completed",
  },
  {
    title: "Attempts Engine",
    body: "creates attempt job",
  },
  {
    title: "attempt_jobs",
    body: "state, scheduling, metadata",
  },
  {
    title: "Attempts Execution",
    body: "cron, retries",
  },
  {
    title: "attempt_messages / attempt_events",
    body: "communication + logs",
  },
  {
    title: "Agent API (optional)",
    body: "agent_runs",
  },
  {
    title: "agent_actions",
    body: "logged decisions",
  },
  {
    title: "Outcome",
    body: "order_placed, expired",
  },
  {
    title: "Delivery",
    body: "webhook / SFTP",
  },
];

export default function AttemptsEnginePage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: saanaColors.softBackground }}
    >
      <MarketingHeader />

      <section className="relative z-10 overflow-hidden border-b border-orange-100 bg-white/90">
        <FloatingPattern className="-right-28 top-10 w-[430px] opacity-[0.07] sm:opacity-[0.08] lg:w-[580px] lg:opacity-[0.10]" />
        <SectionShell className="relative z-10 pb-14 pt-12 sm:pb-20 sm:pt-16">
          <div className="max-w-4xl">
            <p
              className="inline-flex rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.12em]"
              style={{
                backgroundColor: saanaColors.softOrange,
                color: saanaColors.orange,
              }}
            >
              Recovery infrastructure
            </p>
            <h1
              className="mt-6 text-5xl font-black leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl"
              style={{ color: saanaColors.navy }}
            >
              Universal Attempts Engine
            </h1>
            <p
              className="mt-6 max-w-3xl text-lg leading-8 sm:text-xl"
              style={{ color: saanaColors.muted }}
            >
              Turn events into persistent outcomes. The first live use case is
              SaanaOS missed-call recovery for restaurants.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CTAButton href="/restaurant-missed-call-recovery">
                See Missed Call Recovery
              </CTAButton>
              <CTAButton href="/how-it-works" variant="secondary">
                How SaanaOS Works
              </CTAButton>
            </div>
          </div>
        </SectionShell>
      </section>

      <SectionShell className="relative z-10 overflow-hidden bg-white/80">
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2
            className="text-4xl font-black sm:text-5xl"
            style={{ color: saanaColors.navy }}
          >
            How the Attempts Engine Works
          </h2>
          <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
            From event to outcome, every step is tracked and executed.
          </p>
          <p className="mt-3 text-base font-bold" style={{ color: saanaColors.navy }}>
            Most systems try once. The Attempts Engine creates a job and works it
            until an outcome happens.
          </p>
        </div>

        <div className="relative z-10 mt-10 rounded-[32px] border bg-white p-5 shadow-[0_24px_70px_rgba(7,30,65,0.10)] sm:p-7">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
            {diagramSteps.map((step, index) => (
              <div
                key={step.title}
                className="flex flex-col lg:min-w-0 lg:flex-1 lg:flex-row lg:items-center"
              >
                <div className="h-full rounded-2xl border bg-[#fffaf7] p-4 shadow-sm lg:flex-1">
                  <p
                    className="text-sm font-black leading-5"
                    style={{ color: saanaColors.navy }}
                  >
                    {step.title}
                  </p>
                  <p
                    className="mt-2 text-xs leading-5"
                    style={{ color: saanaColors.muted }}
                  >
                    {step.body}
                  </p>
                </div>
                {index < diagramSteps.length - 1 ? (
                  <div
                    className="grid place-items-center py-1 text-lg font-black lg:px-2 lg:py-0"
                    style={{ color: saanaColors.orange }}
                    aria-hidden="true"
                  >
                    <span className="lg:hidden">↓</span>
                    <span className="hidden lg:inline">→</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden">
        <FloatingPattern className="-left-44 bottom-[-120px] hidden w-[430px] opacity-[0.06] lg:block" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2
            className="text-4xl font-black sm:text-5xl"
            style={{ color: saanaColors.navy }}
          >
            Event {"->"} Attempt Job {"->"} Attempts {"->"} Outcome
          </h2>
          <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
            The engine tracks the whole recovery loop, not just a single message.
          </p>
        </div>
        <div className="relative z-10 mt-10 grid gap-5 md:grid-cols-4">
          {["Event", "Attempt Job", "Attempts", "Outcome"].map((step, index) => (
            <div
              key={step}
              className="rounded-3xl border bg-white p-6 text-center shadow-[0_18px_45px_rgba(7,30,65,0.08)]"
            >
              <div
                className="mx-auto grid h-12 w-12 place-items-center rounded-2xl text-lg font-black text-white"
                style={{
                  backgroundColor:
                    index === 2 ? saanaColors.orange : saanaColors.navy,
                }}
              >
                {index + 1}
              </div>
              <h3 className="mt-5 text-xl font-black" style={{ color: saanaColors.navy }}>
                {step}
              </h3>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <FloatingPattern className="-right-40 top-12 hidden w-[440px] opacity-[0.07] lg:block" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.12em]" style={{ color: saanaColors.orange }}>
              First live use case
            </p>
            <h2 className="mt-3 text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
              Missed Call Recovery
            </h2>
            <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
              When a restaurant misses a call, SaanaOS can create an attempt job,
              send the initial recovery link after consent, schedule reminders,
              and stop when an order is placed or the job expires.
            </p>
          </div>
          <div className="rounded-[32px] border bg-white p-7 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
            <h3 className="text-2xl font-black" style={{ color: saanaColors.navy }}>
              Live job states
            </h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {states.map((state) => (
                <div key={state.name} className="rounded-2xl border p-4">
                  <p className="font-black" style={{ color: saanaColors.navy }}>
                    {state.name}
                  </p>
                  <p className="mt-2 text-sm leading-6" style={{ color: saanaColors.muted }}>
                    {state.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden">
        <FloatingPattern className="-left-44 top-20 hidden w-[420px] opacity-[0.06] lg:block" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
            Built as a reusable recovery pattern
          </h2>
          <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
            Post-Checkout is not live yet, but the same engine pattern is ready
            to support future agents.
          </p>
        </div>
        <div className="relative z-10 mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {futurePatterns.map((pattern) => (
            <div key={pattern} className="rounded-3xl border bg-white p-6 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
              <h3 className="text-xl font-black" style={{ color: saanaColors.navy }}>
                {pattern}
              </h3>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <FloatingPattern className="-right-44 bottom-[-130px] hidden w-[440px] opacity-[0.06] lg:block" />
        <div className="relative z-10 grid gap-5 lg:grid-cols-3">
          {audiences.map((audience) => (
            <div key={audience.title} className="rounded-[32px] border bg-white p-7 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
              <h2 className="text-2xl font-black" style={{ color: saanaColors.navy }}>
                {audience.title}
              </h2>
              <p className="mt-4 leading-7" style={{ color: saanaColors.muted }}>
                {audience.body}
              </p>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden">
        <div className="relative z-10 rounded-[32px] border bg-[#fffaf7] p-8 shadow-[0_24px_70px_rgba(7,30,65,0.10)] sm:p-10">
          <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
            Documentation
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: saanaColors.muted }}>
            These internal docs describe the current engine, testing process,
            support SOP, and integration policy.
          </p>
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {docs.map((doc) => (
              <div key={doc} className="rounded-2xl border bg-white px-4 py-3 font-mono text-sm" style={{ color: saanaColors.navy }}>
                {doc}
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      <MarketingFooter />
    </main>
  );
}
