"use client";

import type { ReactNode } from "react";
import { FormEvent, useState } from "react";

import { FloatingPattern } from "@/components/brand/FloatingPattern";
import { CTAButton } from "@/components/marketing/CTAButton";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { SectionShell } from "@/components/marketing/SectionShell";
import { TrustLine } from "@/components/marketing/TrustLine";
import { saanaColors } from "@/lib/brand/colors";
import { saanaBrandCopy } from "@/lib/brand/copy";

type LeadFormData = {
  name: string;
  restaurant: string;
  phone: string;
  email: string;
  locations: string;
  volume: string;
  notes: string;
};

const initialForm: LeadFormData = {
  name: "",
  restaurant: "",
  phone: "",
  email: "",
  locations: "",
  volume: "",
  notes: "",
};

const howItWorksSteps = [
  "Customer calls your restaurant",
  "Missed-call recovery starts",
  "SMS order link is sent after consent",
  "Pickup order appears in your dashboard",
];

const problemCards = [
  {
    title: "Rush hours",
    body: "Staff are taking orders, serving customers, and managing the kitchen while the phone keeps ringing.",
  },
  {
    title: "After hours",
    body: "A caller can still become tomorrow's pickup order if they get a clear ordering path instead of silence.",
  },
  {
    title: "Busy staff",
    body: "SaanaOS helps protect direct orders without forcing your team to answer every call in real time.",
  },
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

export default function HomePage() {
  const [form, setForm] = useState<LeadFormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          restaurant: form.restaurant.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          locations: form.locations,
          volume: form.volume,
          notes: form.notes.trim(),
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to submit form");
      }

      setForm(initialForm);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Lead form error:", error);
      alert("Something went wrong while submitting the form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField<K extends keyof LeadFormData>(
    key: K,
    value: LeadFormData[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: saanaColors.softBackground }}
    >
      <MarketingHeader />

      <section className="relative z-10 overflow-hidden border-b border-orange-100 bg-white/90">
        <FloatingPattern className="-right-28 top-12 w-[420px] opacity-[0.07] sm:opacity-[0.08] lg:w-[560px] lg:opacity-[0.10]" />
        <SectionShell className="relative z-10 pb-14 pt-10 sm:pb-20 sm:pt-16">
          <div className="grid gap-9 sm:gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div
                className="inline-flex rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.12em]"
                style={{
                  backgroundColor: saanaColors.softOrange,
                  color: saanaColors.orange,
                }}
              >
                Phone line included in both plans
              </div>

              <h1
                className="mt-6 max-w-4xl text-5xl font-black leading-[0.98] tracking-normal sm:text-6xl lg:text-[5.25rem] lg:leading-[0.94] xl:text-[5.75rem]"
                style={{ color: saanaColors.navy }}
              >
                Recover missed calls. Turn them into direct pickup orders.
              </h1>

              <p
                className="mt-6 max-w-2xl text-lg leading-8 sm:text-xl lg:text-2xl lg:leading-9"
                style={{ color: saanaColors.muted }}
              >
                SaanaOS helps restaurants send SMS ordering links when calls are
                missed, so customers can still place pickup orders during the
                rush.
              </p>

              <div className="mt-8">
                <TrustLine />
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <CTAButton href="#demo">Book Your Setup</CTAButton>
                <CTAButton href="/pricing" variant="secondary">
                  See Pricing
                </CTAButton>
              </div>
            </div>

            <div className="rounded-[28px] border border-orange-100 bg-[#fffaf7] p-3 shadow-[0_24px_70px_rgba(7,30,65,0.12)] sm:p-6">
              <div className="rounded-[22px] bg-white p-4 shadow-sm sm:p-5">
                <div
                  className="mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.1em]"
                  style={{
                    backgroundColor: saanaColors.softOrange,
                    color: saanaColors.orange,
                  }}
                >
                  Live recovery loop
                </div>
                <div className="space-y-4">
                  {howItWorksSteps.map((step, index) => (
                    <div
                      key={step}
                        className="grid grid-cols-[44px_1fr] items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:grid-cols-[52px_1fr] sm:gap-4 sm:p-4"
                      >
                        <div
                          className="grid h-11 w-11 place-items-center rounded-2xl text-base font-black text-white sm:h-12 sm:w-12 sm:text-lg"
                        style={{
                          backgroundColor:
                            index === 2 ? saanaColors.orange : saanaColors.navy,
                        }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p
                          className="font-bold"
                          style={{ color: saanaColors.navy }}
                        >
                          {step}
                        </p>
                        <p
                          className="text-sm leading-5"
                          style={{ color: saanaColors.muted }}
                        >
                          {index === 0
                            ? "Buying intent starts on your phone line."
                            : index === 1
                              ? "SaanaOS catches the missed opportunity."
                              : index === 2
                                ? "Consent keeps the follow-up clean."
                                : "Direct pickup revenue stays with you."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SectionShell>
      </section>

      <SectionShell className="relative z-10 overflow-hidden">
        <FloatingPattern className="-right-40 top-8 hidden w-[420px] opacity-[0.07] lg:block" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p
              className="text-sm font-black uppercase tracking-[0.14em]"
              style={{ color: saanaColors.orange }}
            >
              The problem
            </p>
            <h2
              className="mt-3 text-4xl font-black tracking-normal sm:text-5xl"
              style={{ color: saanaColors.navy }}
            >
              Missed calls are missed orders.
            </h2>
            <p
              className="mt-4 text-lg leading-8"
              style={{ color: saanaColors.muted }}
            >
              Restaurants miss calls during rush hours, after hours, and when
              staff are busy serving customers. SaanaOS gives those callers a
              simple next step before they order somewhere else.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {problemCards.map((card) => (
              <div
                key={card.title}
                className="rounded-3xl border bg-white p-6 shadow-[0_18px_45px_rgba(7,30,65,0.08)]"
                style={{ borderColor: saanaColors.border }}
              >
                <h3
                  className="text-xl font-black"
                  style={{ color: saanaColors.navy }}
                >
                  {card.title}
                </h3>
                <p
                  className="mt-3 text-sm leading-6"
                  style={{ color: saanaColors.muted }}
                >
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell id="how-it-works" className="relative z-10 overflow-hidden bg-white/90">
        <FloatingPattern className="-left-44 bottom-[-120px] hidden w-[420px] opacity-[0.06] lg:block" />
        <div className="relative z-10 text-center">
          <p
            className="text-sm font-black uppercase tracking-[0.14em]"
            style={{ color: saanaColors.orange }}
          >
            How it works
          </p>
          <h2
            className="mt-3 text-4xl font-black tracking-normal sm:text-5xl"
            style={{ color: saanaColors.navy }}
          >
            Call missed. Order recovered.
          </h2>
        </div>

        <div className="relative z-10 mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {howItWorksSteps.map((step, index) => (
            <div
              key={step}
              className="rounded-3xl border bg-white p-6 shadow-[0_18px_45px_rgba(7,30,65,0.08)]"
              style={{ borderColor: saanaColors.border }}
            >
              <div
                className="mb-5 grid h-12 w-12 place-items-center rounded-2xl text-lg font-black text-white"
                style={{
                  backgroundColor:
                    index === 2 ? saanaColors.orange : saanaColors.navy,
                }}
              >
                {index + 1}
              </div>
              <h3
                className="text-xl font-black"
                style={{ color: saanaColors.navy }}
              >
                {step}
              </h3>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell className="relative z-10 overflow-hidden">
        <FloatingPattern className="right-0 top-12 hidden w-[460px] opacity-[0.07] xl:block" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <p
            className="text-sm font-black uppercase tracking-[0.14em]"
            style={{ color: saanaColors.orange }}
          >
            Pricing preview
          </p>
          <h2
            className="mt-3 text-4xl font-black tracking-normal sm:text-5xl"
            style={{ color: saanaColors.navy }}
          >
            Simple pricing. Per location.
          </h2>
        </div>

        <div className="relative z-10 mt-10 grid gap-5 lg:grid-cols-2">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>

        <div
          className="relative z-10 mt-8 rounded-3xl border bg-white p-6 shadow-[0_18px_45px_rgba(7,30,65,0.08)]"
          style={{ borderColor: saanaColors.border }}
        >
          <h3
            className="text-2xl font-black"
            style={{ color: saanaColors.navy }}
          >
            {saanaBrandCopy.websiteProductLine}
          </h3>
          <p className="mt-3" style={{ color: saanaColors.muted }}>
            Need a restaurant website too? Ask about our website setup package.
          </p>
        </div>
      </SectionShell>

      <SectionShell id="demo" className="relative z-10 overflow-hidden bg-white/90">
        <FloatingPattern className="-right-44 bottom-[-120px] hidden w-[440px] opacity-[0.06] lg:block" />
        <div className="relative z-10 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p
              className="text-sm font-black uppercase tracking-[0.14em]"
              style={{ color: saanaColors.orange }}
            >
              Book setup
            </p>
            <h2
              className="mt-3 text-4xl font-black tracking-normal sm:text-5xl"
              style={{ color: saanaColors.navy }}
            >
              Start recovering missed restaurant orders with SaanaOS.
            </h2>
            <p
              className="mt-4 text-lg leading-8"
              style={{ color: saanaColors.muted }}
            >
              Founding restaurants lock in intro pricing.
            </p>
            <div className="mt-7">
              <CTAButton href="#demo">Book Your Setup</CTAButton>
            </div>
          </div>

          <div
            className="rounded-3xl border p-5 shadow-[0_24px_70px_rgba(7,30,65,0.12)] sm:p-7"
            style={{
              borderColor: saanaColors.border,
              backgroundColor: saanaColors.softBackground,
            }}
          >
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                <Field label="Your name" htmlFor="name">
                  <input
                    id="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Owner or manager name"
                    className={inputClassName}
                  />
                </Field>

                <Field label="Restaurant name" htmlFor="restaurant">
                  <input
                    id="restaurant"
                    type="text"
                    required
                    value={form.restaurant}
                    onChange={(e) => updateField("restaurant", e.target.value)}
                    placeholder="Restaurant name"
                    className={inputClassName}
                  />
                </Field>

                <Field label="Phone number" htmlFor="phone">
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="(555) 555-5555"
                    className={inputClassName}
                  />
                </Field>

                <Field label="Email address" htmlFor="email">
                  <input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="you@restaurant.com"
                    className={inputClassName}
                  />
                </Field>

                <Field label="Number of locations" htmlFor="locations">
                  <select
                    id="locations"
                    required
                    value={form.locations}
                    onChange={(e) => updateField("locations", e.target.value)}
                    className={inputClassName}
                  >
                    <option value="">Select one</option>
                    <option value="1 location">1 location</option>
                    <option value="2–3 locations">2–3 locations</option>
                    <option value="4–10 locations">4–10 locations</option>
                    <option value="10+ locations">10+ locations</option>
                  </select>
                </Field>

                <Field label="Missed call pain today" htmlFor="volume">
                  <select
                    id="volume"
                    required
                    value={form.volume}
                    onChange={(e) => updateField("volume", e.target.value)}
                    className={inputClassName}
                  >
                    <option value="">Select one</option>
                    <option value="We miss calls during rush">
                      We miss calls during rush
                    </option>
                    <option value="We miss after-hours calls">
                      We miss after-hours calls
                    </option>
                    <option value="We are not sure how many calls we miss">
                      We are not sure how many calls we miss
                    </option>
                    <option value="We want a better direct ordering path">
                      We want a better direct ordering path
                    </option>
                  </select>
                </Field>

                <div className="md:col-span-2">
                  <Field label="Anything we should know?" htmlFor="notes">
                    <textarea
                      id="notes"
                      value={form.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                      placeholder="Current ordering setup, busy hours, call volume, or anything else helpful"
                      className={`${inputClassName} min-h-[120px] resize-y`}
                    />
                  </Field>
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                    style={{ backgroundColor: saanaColors.orange }}
                  >
                    {isSubmitting ? "Submitting..." : "Book Your Setup"}
                  </button>
                  <p className="mt-3 text-sm" style={{ color: saanaColors.muted }}>
                    Share your details and the Saana team will follow up shortly.
                  </p>
                </div>
              </form>
            ) : (
              <div
                className="rounded-3xl border bg-white p-6"
                style={{ borderColor: saanaColors.paleOrange }}
              >
                <h3
                  className="text-2xl font-black"
                  style={{ color: saanaColors.navy }}
                >
                  Thank you. We received your request.
                </h3>
                <p className="mt-3" style={{ color: saanaColors.muted }}>
                  A member of the Saana team will contact you shortly.
                </p>
              </div>
            )}
          </div>
        </div>
      </SectionShell>

      <div className="relative z-10">
        <MarketingFooter />
      </div>
    </main>
  );
}

function PricingCard({
  plan,
}: {
  plan: {
    name: string;
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
    </div>
  );
}

const inputClassName =
  "w-full rounded-2xl border bg-white px-4 py-[14px] text-slate-950 outline-none placeholder:text-slate-400 focus:border-orange-400 focus:shadow-[0_0_0_3px_rgba(255,90,0,.12)]";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-2">
      <span className="text-sm font-extrabold" style={{ color: saanaColors.navy }}>
        {label}
      </span>
      {children}
    </label>
  );
}
