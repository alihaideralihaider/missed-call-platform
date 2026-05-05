"use client";

import { useMemo, useState } from "react";

import { FloatingPattern } from "@/components/brand/FloatingPattern";
import { CTAButton } from "@/components/marketing/CTAButton";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { SectionShell } from "@/components/marketing/SectionShell";
import { TrustLine } from "@/components/marketing/TrustLine";
import { saanaColors } from "@/lib/brand/colors";

const defaults = {
  missedCallsPerWeek: 25,
  percentCallersWhoWouldOrder: 40,
  averageOrderValue: 28,
  percentRecoveredWithSms: 25,
  weeksPerMonth: 4.33,
  aggregatorCommissionPercentage: 30,
  monthlyFixedCost: 29,
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

type CalculatorInputs = typeof defaults;

type Scenario = {
  label: string;
  recoveredPercent: number;
  recoveredOrders: number;
  recoveredRevenue: number;
  aggregatorFeeSavings: number;
};

export default function MissedCallRevenueCalculatorPage() {
  const [inputs, setInputs] = useState<CalculatorInputs>(defaults);

  const results = useMemo(() => {
    const monthlyMissedCalls = inputs.missedCallsPerWeek * inputs.weeksPerMonth;
    const monthlyLostOrderOpportunities =
      monthlyMissedCalls * (inputs.percentCallersWhoWouldOrder / 100);
    const estimatedLostRevenue =
      monthlyLostOrderOpportunities * inputs.averageOrderValue;
    const estimatedRecoveredOrders =
      monthlyLostOrderOpportunities * (inputs.percentRecoveredWithSms / 100);
    const estimatedRecoveredRevenue =
      estimatedRecoveredOrders * inputs.averageOrderValue;
    const estimatedAggregatorFeeSavings =
      estimatedRecoveredRevenue * (inputs.aggregatorCommissionPercentage / 100);
    const estimatedNetAfterPlatform =
      estimatedRecoveredRevenue - inputs.monthlyFixedCost;

    const buildScenario = (
      label: string,
      recoveredPercent: number,
    ): Scenario => {
      const recoveredOrders =
        monthlyLostOrderOpportunities * (recoveredPercent / 100);
      const recoveredRevenue = recoveredOrders * inputs.averageOrderValue;
      return {
        label,
        recoveredPercent,
        recoveredOrders,
        recoveredRevenue,
        aggregatorFeeSavings:
          recoveredRevenue * (inputs.aggregatorCommissionPercentage / 100),
      };
    };

    return {
      monthlyMissedCalls,
      monthlyLostOrderOpportunities,
      estimatedLostRevenue,
      estimatedRecoveredOrders,
      estimatedRecoveredRevenue,
      estimatedAggregatorFeeSavings,
      estimatedNetAfterPlatform,
      scenarios: [
        buildScenario("Conservative", inputs.percentRecoveredWithSms * 0.5),
        buildScenario("Expected", inputs.percentRecoveredWithSms),
        buildScenario(
          "Aggressive",
          Math.min(inputs.percentRecoveredWithSms * 1.5, 60),
        ),
      ],
    };
  }, [inputs]);

  function updateInput(key: keyof CalculatorInputs, value: string) {
    const parsed = Number(value);
    setInputs((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
    }));
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: saanaColors.softBackground }}
    >
      <MarketingHeader />

      <section className="relative z-10 overflow-hidden border-b border-orange-100 bg-white/90">
        <FloatingPattern className="-right-28 top-12 w-[420px] opacity-[0.07] sm:opacity-[0.08] lg:w-[560px] lg:opacity-[0.10]" />
        <SectionShell className="relative z-10 pb-14 pt-12 sm:pb-20 sm:pt-16">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p
                className="inline-flex rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.12em]"
                style={{
                  backgroundColor: saanaColors.softOrange,
                  color: saanaColors.orange,
                }}
              >
                Missed Call Revenue Calculator
              </p>
              <h1
                className="mt-6 text-5xl font-black leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl"
                style={{ color: saanaColors.navy }}
              >
                Estimate how much revenue your restaurant may be losing from
                missed calls.
              </h1>
              <p
                className="mt-6 max-w-3xl text-lg leading-8 sm:text-xl"
                style={{ color: saanaColors.muted }}
              >
                Use this simple calculator to estimate missed-call order
                opportunity. This is an educational estimate, not a guarantee.
              </p>
              <div className="mt-7">
                <TrustLine />
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <CTAButton href="#calculator">
                  Calculate missed-call opportunity
                </CTAButton>
                <CTAButton href="/restaurant-missed-call-recovery" variant="secondary">
                  Back to missed-call recovery
                </CTAButton>
              </div>
            </div>

            <div className="rounded-[32px] border bg-white p-6 shadow-[0_24px_70px_rgba(7,30,65,0.10)]">
              <p
                className="text-sm font-black uppercase tracking-[0.14em]"
                style={{ color: saanaColors.orange }}
              >
                Expected recovery estimate
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <MetricCard
                  label="Recovered orders"
                  value={formatNumber(results.estimatedRecoveredOrders)}
                  helper="estimated monthly orders recovered"
                />
                <MetricCard
                  label="Recovered revenue"
                  value={formatMoney(results.estimatedRecoveredRevenue)}
                  helper="estimated direct monthly revenue"
                />
              </div>
              <p
                className="mt-5 rounded-2xl px-4 py-3 text-sm font-bold leading-6"
                style={{
                  backgroundColor: saanaColors.softOrange,
                  color: saanaColors.navy,
                }}
              >
                Results depend on call volume, customer intent, menu prices,
                hours, consent, SMS deliverability, and ordering experience.
              </p>
            </div>
          </div>
        </SectionShell>
      </section>

      <SectionShell id="calculator" className="relative z-10 overflow-hidden">
        <FloatingPattern className="-left-44 bottom-[-120px] hidden w-[430px] opacity-[0.06] lg:block" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2
            className="text-4xl font-black sm:text-5xl"
            style={{ color: saanaColors.navy }}
          >
            Missed-call order opportunity
          </h2>
          <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
            Adjust the assumptions. Percent fields use normal 0-100 values and
            are converted to decimals internally.
          </p>
        </div>

        <div className="relative z-10 mt-10 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[32px] border bg-white p-6 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
            <h3 className="text-2xl font-black" style={{ color: saanaColors.navy }}>
              Calculator inputs
            </h3>
            <div className="mt-6 grid gap-4">
              <NumberInput
                label="Missed calls per week"
                value={inputs.missedCallsPerWeek}
                onChange={(value) => updateInput("missedCallsPerWeek", value)}
              />
              <NumberInput
                label="Percent callers who would order"
                suffix="%"
                max={100}
                value={inputs.percentCallersWhoWouldOrder}
                onChange={(value) =>
                  updateInput("percentCallersWhoWouldOrder", value)
                }
              />
              <NumberInput
                label="Average order value"
                prefix="$"
                value={inputs.averageOrderValue}
                onChange={(value) => updateInput("averageOrderValue", value)}
              />
              <NumberInput
                label="Percent recovered with SMS"
                suffix="%"
                max={100}
                value={inputs.percentRecoveredWithSms}
                onChange={(value) =>
                  updateInput("percentRecoveredWithSms", value)
                }
              />
              <NumberInput
                label="Weeks per month"
                value={inputs.weeksPerMonth}
                step="0.01"
                onChange={(value) => updateInput("weeksPerMonth", value)}
              />
              <NumberInput
                label="Aggregator commission percentage"
                suffix="%"
                max={100}
                value={inputs.aggregatorCommissionPercentage}
                onChange={(value) =>
                  updateInput("aggregatorCommissionPercentage", value)
                }
              />
              <NumberInput
                label="Monthly fixed cost"
                prefix="$"
                value={inputs.monthlyFixedCost}
                onChange={(value) => updateInput("monthlyFixedCost", value)}
              />
            </div>
          </div>

          <div className="rounded-[32px] border bg-white p-6 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
            <h3 className="text-2xl font-black" style={{ color: saanaColors.navy }}>
              Estimated monthly impact
            </h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Monthly missed calls"
                value={formatNumber(results.monthlyMissedCalls)}
                helper="missed calls per week multiplied by weeks per month"
              />
              <MetricCard
                label="Lost order opportunities"
                value={formatNumber(results.monthlyLostOrderOpportunities)}
                helper="missed callers who may have ordered"
              />
              <MetricCard
                label="Estimated lost revenue"
                value={formatMoney(results.estimatedLostRevenue)}
                helper="lost opportunities multiplied by average order value"
              />
              <MetricCard
                label="Recovered orders"
                value={formatNumber(results.estimatedRecoveredOrders)}
                helper="estimated orders recovered through SMS"
              />
              <MetricCard
                label="Recovered revenue"
                value={formatMoney(results.estimatedRecoveredRevenue)}
                helper="estimated direct-order revenue recovered"
              />
              <MetricCard
                label="Aggregator fee savings"
                value={formatMoney(results.estimatedAggregatorFeeSavings)}
                helper="estimated marketplace commission avoided"
              />
              <MetricCard
                label="Net after platform cost"
                value={formatMoney(results.estimatedNetAfterPlatform)}
                helper="recovered revenue minus monthly fixed cost"
                wide
              />
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-8 rounded-3xl border bg-white p-6 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
          <h3 className="text-2xl font-black" style={{ color: saanaColors.navy }}>
            Recovery scenarios
          </h3>
          <p className="mt-3" style={{ color: saanaColors.muted }}>
            Conservative uses half your recovery assumption. Aggressive uses
            1.5x your recovery assumption, capped at 60%.
          </p>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {results.scenarios.map((scenario) => (
              <ScenarioCard key={scenario.label} scenario={scenario} />
            ))}
          </div>
        </div>

        <div
          className="relative z-10 mt-8 rounded-3xl border px-6 py-5 text-sm font-bold leading-6"
          style={{
            backgroundColor: saanaColors.softOrange,
            borderColor: saanaColors.paleOrange,
            color: saanaColors.navy,
          }}
        >
          This is an estimate, not a revenue guarantee. Customers must provide
          proper consent where required. Promotional texting requires separate
          consent.
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <FloatingPattern className="-right-40 top-10 hidden w-[430px] opacity-[0.07] lg:block" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-2">
          <InfoCard
            title="What this calculator teaches"
            items={[
              "Missed calls are not just missed conversations.",
              "Not every missed call becomes an order.",
              "Direct ordering keeps more margin than marketplace orders.",
              "SMS recovery must be bounded and consent-aware.",
              "Even small recovery rates can matter with volume.",
            ]}
          />
          <InfoCard
            title="How SaanaOS helps"
            items={[
              "Dedicated restaurant number.",
              "Missed-call recovery.",
              "SMS ordering link after consent.",
              "Bounded follow-up attempts.",
              "Direct pickup ordering.",
              "No marketplace commission.",
            ]}
          />
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden">
        <FloatingPattern className="-left-40 bottom-[-120px] hidden w-[420px] opacity-[0.06] lg:block" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <h2
              className="text-4xl font-black sm:text-5xl"
              style={{ color: saanaColors.navy }}
            >
              Current live status
            </h2>
            <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
              SaanaOS missed-call recovery is live. The Universal Attempts
              Engine powers bounded recovery attempts. Follow-up stops when an
              order is placed or the job expires.
            </p>
          </div>
          <div className="rounded-[32px] border bg-white p-6 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatusPill label="Live" detail="Missed-call recovery" />
              <StatusPill label="Bounded" detail="Stops on order or expiry" />
              <StatusPill label="Direct" detail="Pickup ordering path" />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <CTAButton href="/pricing">Start founding pricing</CTAButton>
              <CTAButton
                href="mailto:navid@authtoolkit.com?subject=SaanaOS%20Missed%20Call%20Revenue%20Calculator"
                variant="secondary"
              >
                Request setup
              </CTAButton>
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <div className="relative z-10 rounded-[32px] border bg-white p-8 shadow-[0_24px_70px_rgba(7,30,65,0.10)] sm:p-10">
          <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
            Recover more direct restaurant orders.
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8" style={{ color: saanaColors.muted }}>
            Use the calculator as a planning tool, then review the missed-call
            recovery flow, pricing, and technical proof.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CTAButton href="/pricing">Start founding pricing</CTAButton>
            <CTAButton
              href="mailto:navid@authtoolkit.com?subject=SaanaOS%20Missed%20Call%20Revenue%20Calculator"
              variant="secondary"
            >
              Request setup
            </CTAButton>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold">
            <TextLink href="/restaurant-missed-call-recovery">
              Missed-call recovery
            </TextLink>
            <TextLink href="/pricing">Pricing</TextLink>
            <TextLink href="/attempts-engine">Technical proof</TextLink>
          </div>
        </div>
      </SectionShell>

      <MarketingFooter />
    </main>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  max,
  step = "1",
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  max?: number;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black" style={{ color: saanaColors.navy }}>
        {label}
      </span>
      <span className="mt-2 flex items-center rounded-2xl border bg-white px-4 py-3 shadow-sm" style={{ borderColor: saanaColors.border }}>
        {prefix ? (
          <span className="mr-2 font-black" style={{ color: saanaColors.orange }}>
            {prefix}
          </span>
        ) : null}
        <input
          className="min-w-0 flex-1 bg-transparent text-base font-black outline-none"
          type="number"
          min="0"
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={{ color: saanaColors.navy }}
        />
        {suffix ? (
          <span className="ml-2 font-black" style={{ color: saanaColors.orange }}>
            {suffix}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function MetricCard({
  label,
  value,
  helper,
  wide = false,
}: {
  label: string;
  value: string;
  helper: string;
  wide?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-3xl border p-5",
        wide ? "sm:col-span-2" : "",
      ].join(" ")}
      style={{
        backgroundColor: saanaColors.softBackground,
        borderColor: saanaColors.border,
      }}
    >
      <p className="text-sm font-black" style={{ color: saanaColors.navy }}>
        {label}
      </p>
      <p className="mt-3 text-3xl font-black" style={{ color: saanaColors.orange }}>
        {value}
      </p>
      <p className="mt-2 text-sm leading-6" style={{ color: saanaColors.muted }}>
        {helper}
      </p>
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: Scenario }) {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{
        backgroundColor: saanaColors.softBackground,
        borderColor: saanaColors.border,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <h4 className="text-xl font-black" style={{ color: saanaColors.navy }}>
          {scenario.label}
        </h4>
        <span
          className="rounded-full px-3 py-1 text-xs font-black"
          style={{ backgroundColor: saanaColors.softOrange, color: saanaColors.orange }}
        >
          {decimalFormatter.format(scenario.recoveredPercent)}%
        </span>
      </div>
      <dl className="mt-5 space-y-3">
        <ScenarioRow label="Recovered orders" value={formatNumber(scenario.recoveredOrders)} />
        <ScenarioRow label="Recovered revenue" value={formatMoney(scenario.recoveredRevenue)} />
        <ScenarioRow label="Fee savings" value={formatMoney(scenario.aggregatorFeeSavings)} />
      </dl>
    </div>
  );
}

function ScenarioRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t pt-3" style={{ borderColor: saanaColors.border }}>
      <dt className="text-sm font-semibold" style={{ color: saanaColors.muted }}>
        {label}
      </dt>
      <dd className="text-right font-black" style={{ color: saanaColors.navy }}>
        {value}
      </dd>
    </div>
  );
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[32px] border bg-white p-6 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
      <h2 className="text-3xl font-black" style={{ color: saanaColors.navy }}>
        {title}
      </h2>
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm font-semibold leading-6" style={{ color: saanaColors.muted }}>
            <span
              className="mt-2 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: saanaColors.orange }}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusPill({ label, detail }: { label: string; detail: string }) {
  return (
    <div
      className="rounded-3xl border p-4"
      style={{
        backgroundColor: saanaColors.softBackground,
        borderColor: saanaColors.border,
      }}
    >
      <p className="text-sm font-black" style={{ color: saanaColors.orange }}>
        {label}
      </p>
      <p className="mt-2 text-sm font-bold leading-5" style={{ color: saanaColors.navy }}>
        {detail}
      </p>
    </div>
  );
}

function TextLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      className="rounded-full border px-4 py-2 transition hover:-translate-y-0.5"
      style={{ borderColor: saanaColors.border, color: saanaColors.navy }}
    >
      {children}
    </a>
  );
}

function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}
