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
  monthlyPickupCustomers: 500,
  qrScanRate: 10,
  offerRevealRate: 60,
  revealToOrderConversion: 20,
  averageOrderValue: 28,
  averageDiscountAmount: 3,
};

type CalculatorInputs = typeof defaults;

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export default function MysteryQrRevenueCalculatorPage() {
  const [inputs, setInputs] = useState<CalculatorInputs>(defaults);

  const results = useMemo(() => {
    const estimatedScans =
      inputs.monthlyPickupCustomers * (inputs.qrScanRate / 100);
    const estimatedReveals = estimatedScans * (inputs.offerRevealRate / 100);
    const estimatedQrOrders =
      estimatedReveals * (inputs.revealToOrderConversion / 100);
    const estimatedGrossQrRevenue =
      estimatedQrOrders * inputs.averageOrderValue;
    const estimatedDiscountCost =
      estimatedQrOrders * inputs.averageDiscountAmount;
    const estimatedNetRevenueAfterDiscount =
      estimatedGrossQrRevenue - estimatedDiscountCost;

    return {
      estimatedScans,
      estimatedReveals,
      estimatedQrOrders,
      estimatedGrossQrRevenue,
      estimatedDiscountCost,
      estimatedNetRevenueAfterDiscount,
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
                Mystery QR Revenue Estimate Calculator
              </p>
              <h1
                className="mt-6 text-5xl font-black leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl"
                style={{ color: saanaColors.navy }}
              >
                Estimate how QR offers could influence direct pickup revenue.
              </h1>
              <p
                className="mt-6 max-w-3xl text-lg leading-8 sm:text-xl"
                style={{ color: saanaColors.muted }}
              >
                Use this calculator to estimate how receipt stickers, counter
                cards, takeout bags, menus, and catering flyers could influence
                direct ordering. This is an educational estimate, not a
                guarantee.
              </p>
              <div className="mt-7">
                <TrustLine />
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <CTAButton href="#calculator">Estimate QR opportunity</CTAButton>
                <CTAButton
                  href="/restaurant-missed-call-recovery-deal-room"
                  variant="secondary"
                >
                  View Deal Room
                </CTAButton>
              </div>
            </div>

            <div className="rounded-[32px] border bg-white p-6 shadow-[0_24px_70px_rgba(7,30,65,0.10)]">
              <p
                className="text-sm font-black uppercase tracking-[0.14em]"
                style={{ color: saanaColors.orange }}
              >
                Estimated monthly QR influence
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <MetricCard
                  label="Estimated QR orders"
                  value={formatNumber(results.estimatedQrOrders)}
                  helper="monthly orders influenced by reveals"
                />
                <MetricCard
                  label="Estimated net revenue after discount"
                  value={formatMoney(results.estimatedNetRevenueAfterDiscount)}
                  helper="gross QR revenue minus estimated discount cost"
                />
              </div>
              <p
                className="mt-5 rounded-2xl px-4 py-3 text-sm font-bold leading-6"
                style={{
                  backgroundColor: saanaColors.softOrange,
                  color: saanaColors.navy,
                }}
              >
                You approve the offers. SaanaOS decides when to show them.
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
            Mystery QR revenue estimate
          </h2>
          <p className="mt-4 text-lg leading-8" style={{ color: saanaColors.muted }}>
            Percent fields use 0-100 values and are converted to decimals in
            the calculation.
          </p>
        </div>

        <div className="relative z-10 mt-10 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[32px] border bg-white p-6 shadow-[0_18px_45px_rgba(7,30,65,0.08)]">
            <h3 className="text-2xl font-black" style={{ color: saanaColors.navy }}>
              Calculator inputs
            </h3>
            <div className="mt-6 grid gap-4">
              <NumberInput
                label="Monthly pickup customers"
                value={inputs.monthlyPickupCustomers}
                onChange={(value) => updateInput("monthlyPickupCustomers", value)}
              />
              <NumberInput
                label="QR scan rate"
                suffix="%"
                max={100}
                value={inputs.qrScanRate}
                onChange={(value) => updateInput("qrScanRate", value)}
              />
              <NumberInput
                label="Offer reveal rate"
                suffix="%"
                max={100}
                value={inputs.offerRevealRate}
                onChange={(value) => updateInput("offerRevealRate", value)}
              />
              <NumberInput
                label="Reveal-to-order conversion"
                suffix="%"
                max={100}
                value={inputs.revealToOrderConversion}
                onChange={(value) =>
                  updateInput("revealToOrderConversion", value)
                }
              />
              <NumberInput
                label="Average order value"
                prefix="$"
                value={inputs.averageOrderValue}
                onChange={(value) => updateInput("averageOrderValue", value)}
              />
              <NumberInput
                label="Average discount amount"
                prefix="$"
                value={inputs.averageDiscountAmount}
                onChange={(value) =>
                  updateInput("averageDiscountAmount", value)
                }
              />
            </div>
          </div>

          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Estimated scans"
                value={formatNumber(results.estimatedScans)}
                helper="pickup customers who scan"
              />
              <MetricCard
                label="Estimated reveals"
                value={formatNumber(results.estimatedReveals)}
                helper="scans that reveal an offer"
              />
              <MetricCard
                label="Estimated QR orders"
                value={formatNumber(results.estimatedQrOrders)}
                helper="reveals that become pickup orders"
              />
              <MetricCard
                label="Estimated QR-driven revenue"
                value={formatMoney(results.estimatedGrossQrRevenue)}
                helper="before estimated discount cost"
              />
              <MetricCard
                label="Estimated discount cost"
                value={formatMoney(results.estimatedDiscountCost)}
                helper="estimated cost of offer discounts"
              />
              <MetricCard
                label="Estimated net revenue after discount"
                value={formatMoney(results.estimatedNetRevenueAfterDiscount)}
                helper="estimated QR-driven revenue minus discounts"
              />
            </div>

            <div
              className="rounded-[28px] border p-6"
              style={{
                backgroundColor: saanaColors.softOrange,
                borderColor: saanaColors.paleOrange,
              }}
            >
              <h3 className="text-2xl font-black" style={{ color: saanaColors.navy }}>
                Estimate only
              </h3>
              <p className="mt-3 text-sm font-bold leading-6" style={{ color: saanaColors.muted }}>
                This calculator is an estimate. Actual results depend on
                customer behavior, restaurant offer terms, scan placement, and
                redemption tracking.
              </p>
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden bg-white/90">
        <div className="relative z-10 rounded-[32px] border bg-white p-8 shadow-[0_24px_70px_rgba(7,30,65,0.10)] sm:p-10">
          <h2 className="text-4xl font-black sm:text-5xl" style={{ color: saanaColors.navy }}>
            Add Mystery QR Offers to your pickup flow
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8" style={{ color: saanaColors.muted }}>
            Turn receipts, counter cards, takeout bags, menus, window decals,
            business cards, and catering flyers into direct pickup order paths.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CTAButton href="/pricing">Start founding pricing</CTAButton>
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

function formatMoney(value: number) {
  return moneyFormatter.format(Math.max(0, value));
}

function formatNumber(value: number) {
  return numberFormatter.format(Math.max(0, value));
}

function NumberInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  max?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black" style={{ color: saanaColors.navy }}>
        {label}
      </span>
      <div className="mt-2 flex overflow-hidden rounded-2xl border bg-white">
        {prefix ? (
          <span className="grid place-items-center border-r px-3 text-sm font-black text-neutral-500">
            {prefix}
          </span>
        ) : null}
        <input
          type="number"
          min="0"
          max={max}
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 px-3 py-3 text-sm font-bold outline-none"
          style={{ color: saanaColors.navy }}
        />
        {suffix ? (
          <span className="grid place-items-center border-l px-3 text-sm font-black text-neutral-500">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-[0_12px_35px_rgba(7,30,65,0.06)]">
      <p className="text-xs font-black uppercase tracking-[0.12em]" style={{ color: saanaColors.muted }}>
        {label}
      </p>
      <p className="mt-3 text-3xl font-black" style={{ color: saanaColors.navy }}>
        {value}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6" style={{ color: saanaColors.muted }}>
        {helper}
      </p>
    </div>
  );
}
