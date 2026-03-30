
"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";

const DEMO_VIDEO_URL = "https://youtube.com/YOUR_DEMO_VIDEO";

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

  function updateField<K extends keyof LeadFormData>(key: K, value: LeadFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <main className="min-h-screen bg-[#081120] text-[#e7eef9]">
      <div className="mx-auto max-w-[1140px] px-6">
        <nav className="flex items-center justify-between gap-4 py-5">
          <Link href="#top" className="flex min-w-0 items-center gap-3" aria-label="Saana home">
            <div className="h-11 w-11 overflow-hidden rounded-[14px] border border-white/10 bg-[#10203a] shadow-[0_8px_20px_rgba(0,0,0,.18)]">
              <Image src="/logo.svg" alt="Saana logo" width={44} height={44} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="text-[18px] font-semibold leading-tight tracking-[-0.02em] text-[#f8fbff]">
                Saana
              </div>
              <div className="text-[12px] font-bold tracking-[0.02em] text-[#a7b6cc]">
                Restaurant Missed Call Recovery
              </div>
            </div>
          </Link>

          <a
            href="#demo"
            className="inline-flex items-center justify-center rounded-[14px] bg-[#ff8a3d] px-5 py-3 font-extrabold text-[#211307] shadow-[0_12px_28px_rgba(255,138,61,.24)] transition hover:-translate-y-[1px]"
          >
            Book a demo
          </a>
        </nav>

        <section
          id="top"
          className="grid gap-7 py-8 pb-16 lg:grid-cols-[1.03fr_.97fr] lg:items-center"
        >
          <div>
            <div className="inline-flex items-center rounded-full border border-[#ff8a3d]/20 bg-[#ff8a3d]/12 px-3 py-2 text-[12px] font-black uppercase tracking-[0.08em] text-[#ffc8a2]">
              Missed-call recovery for restaurants
            </div>

            <h1 className="mt-5 text-5xl font-black leading-none tracking-[-0.045em] text-[#f8fbff] md:text-6xl">
              Miss a call. Lose an order. We fix that.
            </h1>

            <p className="mt-4 max-w-[680px] text-xl text-[#a7b6cc]">
              When your restaurant can’t answer the phone, Saana gives customers a
              fast way to still place their order instead of ordering somewhere else.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#demo"
                className="inline-flex items-center justify-center rounded-[14px] bg-[#ff8a3d] px-5 py-3 font-extrabold text-[#211307] shadow-[0_12px_28px_rgba(255,138,61,.24)] transition hover:-translate-y-[1px]"
              >
                Book a demo
              </a>
              <a
                href="#how"
                className="inline-flex items-center justify-center rounded-[14px] border border-white/12 bg-white/[0.03] px-5 py-3 font-extrabold text-[#e7eef9] transition hover:-translate-y-[1px]"
              >
                See how it works
              </a>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
                <div className="mb-1 text-[15px] font-semibold text-[#f8fbff]">
                  Missed calls = lost orders
                </div>
                <div className="text-[#a7b6cc]">
                  Catch customers who already had buying intent.
                </div>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
                <div className="mb-1 text-[15px] font-semibold text-[#f8fbff]">
                  Recover revenue you already earned
                </div>
                <div className="text-[#a7b6cc]">
                  Turn phone misses into another chance to buy.
                </div>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
                <div className="mb-1 text-[15px] font-semibold text-[#f8fbff]">
                  Works with your current setup
                </div>
                <div className="text-[#a7b6cc]">
                  Start without replacing your POS or entire stack.
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
            <div className="grid gap-4">
              {[
                {
                  num: "1",
                  title: "Customer calls",
                  text: "They are ready to order right now.",
                  accent: false,
                },
                {
                  num: "2",
                  title: "You miss the call",
                  text: "Busy line, short staff, or after hours.",
                  accent: false,
                },
                {
                  num: "3",
                  title: "Saana steps in",
                  text: "Customer gets a fast ordering path instead of bouncing.",
                  accent: true,
                },
                {
                  num: "4",
                  title: "Order captured",
                  text: "You keep the business and track the result.",
                  accent: false,
                },
              ].map((step) => (
                <div
                  key={step.num}
                  className="grid grid-cols-[58px_1fr] items-center gap-4 rounded-[18px] border border-white/10 bg-[rgba(8,17,32,.74)] p-4"
                >
                  <div
                    className={`grid h-[58px] w-[58px] place-items-center rounded-[18px] border border-white/10 font-black ${
                      step.accent
                        ? "bg-gradient-to-b from-[#ff9f60] to-[#ff8a3d] text-[#24150a]"
                        : "bg-gradient-to-b from-[#1a2745] to-[#0f172b] text-[#f8fbff]"
                    }`}
                  >
                    {step.num}
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-[#f8fbff]">
                      {step.title}
                    </div>
                    <div className="text-[#a7b6cc]">{step.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-5">
          <h2 className="mb-3 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            You’re losing orders without realizing it
          </h2>
          <p className="mb-6 max-w-[780px] text-[#a7b6cc]">
            During busy hours, the phone keeps ringing. Staff cannot answer every
            call. Customers do not wait. They move on. These lost orders are
            invisible until you recover them.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
              <h3 className="mb-2 text-xl font-semibold text-[#f8fbff]">During the rush</h3>
              <p className="text-[#a7b6cc]">
                Phones ring while staff are already serving guests, working expo,
                or managing the kitchen. Saana gives those callers another way to buy.
              </p>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
              <h3 className="mb-2 text-xl font-semibold text-[#f8fbff]">After hours</h3>
              <p className="text-[#a7b6cc]">
                A missed call late in the day can still become an order if the
                customer gets a clear path instead of a dead end.
              </p>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
              <h3 className="mb-2 text-xl font-semibold text-[#f8fbff]">No visibility</h3>
              <p className="text-[#a7b6cc]">
                Most owners never see how many orders disappear because the phone
                was not answered. Saana makes that measurable.
              </p>
            </div>
          </div>
        </section>

        <section id="how" className="py-5">
          <h2 className="mb-3 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            How it works
          </h2>
          <p className="mb-6 max-w-[780px] text-[#a7b6cc]">
            Saana stays focused on one sharp loop: missed call to recovered order.
            That keeps the value clear and the setup simple.
          </p>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Step 1", "Catch the missed call", "Saana records the inbound event when the restaurant does not answer."],
              ["Step 2", "Send the recovery path", "The customer gets pushed into a clean digital ordering experience instead of disappearing to a competitor."],
              ["Step 3", "Capture the order", "The guest completes the order in your current flow or in a Saana-powered ordering path."],
              ["Step 4", "Track the outcome", "Measure missed calls, recovered orders, and the revenue that would have been lost."],
            ].map(([step, title, text]) => (
              <div key={step} className="rounded-[22px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
                <div className="mb-3 inline-flex items-center rounded-full border border-[#80efe2]/20 bg-[#80efe2]/10 px-2.5 py-1 text-[12px] font-black uppercase tracking-[0.06em] text-[#9af1e6]">
                  {step}
                </div>
                <h3 className="mb-2 text-xl font-semibold text-[#f8fbff]">{title}</h3>
                <p className="text-[#a7b6cc]">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border-l-4 border-[#ff8a3d] bg-[#ff8a3d]/10 px-4 py-3 text-[#f4ccb0]">
            Early-stage reality: if automated messaging is not yet cleared, Saana can
            still run a demo or manual recovery path to prove the ordering loop before scaling.
          </div>
        </section>

        <section className="py-5">
          <h2 className="mb-5 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            What this means for your restaurant
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
              <div className="mb-1 text-[15px] font-semibold text-[#f8fbff]">More orders</div>
              <div className="text-[#a7b6cc]">Capture customers you are currently losing.</div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
              <div className="mb-1 text-[15px] font-semibold text-[#f8fbff]">Less pressure</div>
              <div className="text-[#a7b6cc]">Reduce phone load during peak hours.</div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
              <div className="mb-1 text-[15px] font-semibold text-[#f8fbff]">Clear visibility</div>
              <div className="text-[#a7b6cc]">Track missed calls and recovered revenue.</div>
            </div>
          </div>
        </section>

        <section className="py-5">
          <h2 className="mb-3 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            Best fit for launch
          </h2>
          <p className="mb-6 max-w-[780px] text-[#a7b6cc]">
            Start where the pain is obvious and where owners can feel the problem every day.
          </p>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Independent restaurants", "Fast decision cycles and less red tape."],
              ["Quick service", "High call volume and speed-sensitive orders."],
              ["Casual dining", "Strong takeout demand without enterprise complexity."],
              ["Small groups first", "One to three locations before larger rollouts."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-[22px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
                <h3 className="mb-2 text-xl font-semibold text-[#f8fbff]">{title}</h3>
                <p className="text-[#a7b6cc]">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="py-5">
          <h2 className="mb-3 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            Simple launch pricing
          </h2>
          <p className="mb-6 max-w-[780px] text-[#a7b6cc]">
            Keep pricing easy to understand. Charge for the outcome, not telephony complexity.
          </p>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <PricingCard
              tag="Pilot"
              price="$49"
              subtitle="first 30 days"
              items={[
                "1 location",
                "White-glove onboarding",
                "Manual or demo recovery flow is okay",
                "Goal: prove recovered orders",
              ]}
            />
            <PricingCard
              tag="Core"
              price="$149"
              subtitle="per month"
              featured
              items={[
                "1 location",
                "Missed-call capture",
                "Recovery link or ordering handoff",
                "Basic reporting and support",
              ]}
            />
            <PricingCard
              tag="Growth"
              price="$299"
              subtitle="per month"
              items={[
                "Everything in Core",
                "After-hours rules and branded flow",
                "Priority support",
                "Best once the loop is already working",
              ]}
            />
            <PricingCard
              tag="Multi-location"
              price="Custom"
              subtitle="from $799+"
              custom
              items={[
                "Multiple stores",
                "Central reporting",
                "Rollout support",
                "Deeper integrations later",
              ]}
            />
          </div>
        </section>

        <section className="py-5">
          <h2 className="mb-6 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            Frequently asked questions
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["Do I need to replace my POS?", "No. Saana can start by sending callers into your current ordering flow."],
              ["Is this another giant software suite?", "No. The point is to solve one sharp problem first: missed calls that become lost orders."],
              ["How long should setup take?", "The first version should be quick and white-glove. Complexity should stay on Saana’s side, not the restaurant’s."],
              ["What should we measure?", "Missed calls, recovered orders, recovered revenue, and the share of callers who complete the recovery path."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-[22px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
                <h3 className="mb-2 text-xl font-semibold text-[#f8fbff]">{title}</h3>
                <p className="text-[#a7b6cc]">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="demo" className="py-5 pb-12">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
            <h2 className="mb-3 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
              Stop losing orders you already earned
            </h2>
            <p className="mb-6 max-w-[780px] text-[#a7b6cc]">
              Book a pilot demo and see how many missed calls your restaurant gets and how many Saana can turn into real orders.
            </p>

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
                    className="w-full rounded-[14px] border border-white/12 bg-white/[0.03] px-4 py-[14px] text-[#e7eef9] outline-none placeholder:text-[#8fa0bb] focus:border-[#80efe2]/45 focus:shadow-[0_0_0_3px_rgba(128,239,226,.10)]"
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
                    className="w-full rounded-[14px] border border-white/12 bg-white/[0.03] px-4 py-[14px] text-[#e7eef9] outline-none placeholder:text-[#8fa0bb] focus:border-[#80efe2]/45 focus:shadow-[0_0_0_3px_rgba(128,239,226,.10)]"
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
                    className="w-full rounded-[14px] border border-white/12 bg-white/[0.03] px-4 py-[14px] text-[#e7eef9] outline-none placeholder:text-[#8fa0bb] focus:border-[#80efe2]/45 focus:shadow-[0_0_0_3px_rgba(128,239,226,.10)]"
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
                    className="w-full rounded-[14px] border border-white/12 bg-white/[0.03] px-4 py-[14px] text-[#e7eef9] outline-none placeholder:text-[#8fa0bb] focus:border-[#80efe2]/45 focus:shadow-[0_0_0_3px_rgba(128,239,226,.10)]"
                  />
                </Field>

                <Field label="Number of locations" htmlFor="locations">
                  <select
                    id="locations"
                    required
                    value={form.locations}
                    onChange={(e) => updateField("locations", e.target.value)}
                    className="w-full rounded-[14px] border border-white/12 bg-white/[0.03] px-4 py-[14px] text-[#e7eef9] outline-none focus:border-[#80efe2]/45 focus:shadow-[0_0_0_3px_rgba(128,239,226,.10)]"
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
                    className="w-full rounded-[14px] border border-white/12 bg-white/[0.03] px-4 py-[14px] text-[#e7eef9] outline-none focus:border-[#80efe2]/45 focus:shadow-[0_0_0_3px_rgba(128,239,226,.10)]"
                  >
                    <option value="">Select one</option>
                    <option value="We miss calls during rush">We miss calls during rush</option>
                    <option value="We miss after-hours calls">We miss after-hours calls</option>
                    <option value="We are not sure how many calls we miss">We are not sure how many calls we miss</option>
                    <option value="We want a better direct ordering path">We want a better direct ordering path</option>
                  </select>
                </Field>

                <div className="md:col-span-2">
                  <Field label="Anything we should know?" htmlFor="notes">
                    <textarea
                      id="notes"
                      value={form.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                      placeholder="Current ordering setup, busy hours, call volume, or anything else helpful"
                      className="min-h-[120px] w-full resize-y rounded-[14px] border border-white/12 bg-white/[0.03] px-4 py-[14px] text-[#e7eef9] outline-none placeholder:text-[#8fa0bb] focus:border-[#80efe2]/45 focus:shadow-[0_0_0_3px_rgba(128,239,226,.10)]"
                    />
                  </Field>
                </div>

                <div className="md:col-span-2">
                  <div className="mt-2 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center rounded-[14px] bg-[#ff8a3d] px-5 py-3 font-extrabold text-[#211307] shadow-[0_12px_28px_rgba(255,138,61,.24)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting ? "Submitting..." : "Request demo"}
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-[#a7b6cc]">
                    Share your details and the Saana team will follow up shortly.
                  </p>
                </div>
              </form>
            ) : (
              <div className="mt-4 rounded-[14px] border border-[#80efe2]/20 bg-[#80efe2]/10 p-5 font-extrabold text-[#a7f3eb]">
                Thank you. We received your request.
                <br />
                <br />
                A member of the Saana team will contact you shortly.
                <br />
                <br />
                <a
                  href={DEMO_VIDEO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-[14px] border border-white/12 bg-white/[0.03] px-5 py-3 font-extrabold text-[#e7eef9] transition hover:-translate-y-[1px]"
                >
                  Watch 2-minute demo
                </a>
              </div>
            )}
          </div>
        </section>

        <footer className="pb-10 pt-5 text-sm text-[#8796ad]">
          Saana Systems — Restaurant communication, reimagined
        </footer>
      </div>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-2">
      <span className="text-sm font-extrabold text-[#f8fbff]">{label}</span>
      {children}
    </label>
  );
}

function PricingCard({
  tag,
  price,
  subtitle,
  items,
  featured = false,
  custom = false,
}: {
  tag: string;
  price: string;
  subtitle: string;
  items: string[];
  featured?: boolean;
  custom?: boolean;
}) {
  return (
    <div
      className={`rounded-[22px] border p-6 shadow-[0_18px_60px_rgba(0,0,0,.28)] ${
        featured
          ? "border-[#80efe2]/24 bg-[linear-gradient(180deg,rgba(23,36,66,.96),rgba(14,27,51,.98))]"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <div className="mb-3 inline-flex items-center rounded-full border border-[#80efe2]/20 bg-[#80efe2]/10 px-2.5 py-1 text-[12px] font-black uppercase tracking-[0.06em] text-[#9af1e6]">
        {tag}
      </div>

      <div className={`${custom ? "text-[32px]" : "text-[42px]"} font-black leading-none tracking-[-0.04em] text-[#f8fbff]`}>
        {price}
      </div>
      <div className="mt-1 text-[#a7b6cc]">{subtitle}</div>

      <ul className="mt-4 list-disc space-y-2 pl-5 text-[#a7b6cc]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
